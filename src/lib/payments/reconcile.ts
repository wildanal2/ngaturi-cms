import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { applyPaymentObservation, type AppliedPaymentResult } from "./grant";
import {
  PaymentProviderError,
  type PaymentProvider,
  type PaymentResultStatus,
} from "./provider";
import { resolvePaymentProvider } from "./registry";
import { unresolvedPaymentCondition } from "./query-policy";
import { isLegacyLocalExpiration } from "./processing-metadata";

export const RECONCILIATION_MIN_AGE_MINUTES = 2;
export const RECONCILIATION_BATCH_SIZE = 50;
export const RECONCILIATION_CONCURRENCY = 5;

export type ReconciliationCandidate = Pick<
  typeof payments.$inferSelect,
  | "id"
  | "provider"
  | "providerOrderId"
  | "providerPaymentId"
  | "createdAt"
  | "status"
  | "paidAt"
  | "rawWebhook"
>;

interface ReconciliationWindow {
  newestCreatedAt: Date;
  limit: number;
}
interface ReconciliationDependencies {
  database?: Database;
  now?: Date;
  loadCandidates?: typeof loadUnresolvedPayments;
  resolveProvider?: (provider: string) => PaymentProvider;
  applyResult?: typeof applyPaymentObservation;
  recordAttempt?: typeof recordReconciliationAttempt;
}

export interface PaymentReconciliationSummary {
  selected: number;
  checked: number;
  transitioned: number;
  fulfilled: number;
  reviewRequired: number;
  aged: number;
  missingReference: number;
  unavailableProvider: number;
  statuses: Record<PaymentResultStatus, number>;
  errors: number;
  truncated: boolean;
}

export async function loadUnresolvedPayments(
  { newestCreatedAt, limit }: ReconciliationWindow,
  database: Database = db,
): Promise<ReconciliationCandidate[]> {
  return database
    .select({
      id: payments.id,
      provider: payments.provider,
      providerOrderId: payments.providerOrderId,
      providerPaymentId: payments.providerPaymentId,
      createdAt: payments.createdAt,
      status: payments.status,
      paidAt: payments.paidAt,
      rawWebhook: payments.rawWebhook,
    })
    .from(payments)
    .where(
      and(
        unresolvedPaymentCondition(),
        lte(payments.createdAt, newestCreatedAt),
      ),
    )
    .orderBy(
      // Never attempted first, then least recently attempted, across restarts/Workers.
      asc(
        sql`coalesce(${payments.rawWebhook}->'reconciliation'->>'attemptedAt', '')`,
      ),
      asc(payments.createdAt),
      asc(payments.id),
    )
    .limit(limit);
}

/** Update only safe recovery metadata, atomically preserving concurrent financial evidence. */
export async function recordReconciliationAttempt(
  candidate: ReconciliationCandidate,
  attemptedAt: Date,
  category: string,
  database: Database = db,
): Promise<void> {
  const record = JSON.stringify({
    attemptedAt: attemptedAt.toISOString(),
    category,
  });
  const base = isLegacyLocalExpiration(candidate)
    ? sql`jsonb_set(coalesce(${payments.rawWebhook}, '{}'::jsonb), '{processing}', coalesce(${payments.rawWebhook}->'processing', '{}'::jsonb) || '{"legacyExpirationRecovery":true}'::jsonb)`
    : sql`coalesce(${payments.rawWebhook}, '{}'::jsonb)`;
  await database
    .update(payments)
    .set({
      rawWebhook: sql`jsonb_set(${base}, '{reconciliation}', ${record}::jsonb)`,
    })
    .where(and(eq(payments.id, candidate.id), unresolvedPaymentCondition()));
}

function errorCategory(error: unknown): string {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  )
    return error.code;
  return "provider_or_processing_error";
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await task(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
}

/** One existing scheduler, mixed providers, no maximum-age exclusion or local expiration. */
export async function reconcilePayments(
  dependencies: ReconciliationDependencies = {},
): Promise<PaymentReconciliationSummary> {
  const database = dependencies.database ?? db;
  const now = dependencies.now ?? new Date();
  const loadCandidates = dependencies.loadCandidates ?? loadUnresolvedPayments;
  const resolveProvider =
    dependencies.resolveProvider ?? resolvePaymentProvider;
  const applyResult = dependencies.applyResult ?? applyPaymentObservation;
  const recordAttempt =
    dependencies.recordAttempt ?? recordReconciliationAttempt;
  const rows = await loadCandidates(
    {
      newestCreatedAt: new Date(
        now.getTime() - RECONCILIATION_MIN_AGE_MINUTES * 60_000,
      ),
      limit: RECONCILIATION_BATCH_SIZE + 1,
    },
    database,
  );
  const candidates = rows.slice(0, RECONCILIATION_BATCH_SIZE);
  const summary: PaymentReconciliationSummary = {
    selected: candidates.length,
    checked: 0,
    transitioned: 0,
    fulfilled: 0,
    reviewRequired: 0,
    aged: 0,
    missingReference: 0,
    unavailableProvider: 0,
    statuses: { paid: 0, expired: 0, failed: 0, pending: 0, refunded: 0 },
    errors: 0,
    truncated: rows.length > RECONCILIATION_BATCH_SIZE,
  };
  await runWithConcurrency(
    candidates,
    RECONCILIATION_CONCURRENCY,
    async (candidate) => {
      if (candidate.createdAt.getTime() < now.getTime() - 24 * 3_600_000)
        summary.aged++;
      let category = "checking";
      try {
        // Rotate even timed-out/unconfigured candidates, so they cannot monopolize the next batch.
        await recordAttempt(candidate, now, category, database);
        if (!candidate.providerOrderId) {
          summary.missingReference++;
          throw new PaymentProviderError(
            "missing_merchant_reference",
            "unavailable",
          );
        }
        const provider = resolveProvider(candidate.provider);
        const result = await provider.getPaymentStatus({
          providerOrderId: candidate.providerOrderId,
          providerPaymentId: candidate.providerPaymentId,
        });
        const applied: AppliedPaymentResult = await applyResult(
          result,
          {
            source: "reconciliation",
            paymentId: candidate.id,
          },
          database,
        );
        summary.checked++;
        summary.statuses[applied.status]++;
        if (applied.transitioned) summary.transitioned++;
        if (applied.fulfilled) summary.fulfilled++;
        if (applied.reviewRequired) summary.reviewRequired++;
        category = applied.reviewRequired ? "review_required" : applied.status;
      } catch (error) {
        summary.errors++;
        category = errorCategory(error);
        if (
          error instanceof PaymentProviderError &&
          error.outcome === "unavailable"
        ) {
          summary.unavailableProvider++;
          summary.reviewRequired++;
        }
        console.warn(
          "Payment reconciliation candidate failed",
          JSON.stringify({
            paymentId: candidate.id,
            provider: candidate.provider,
            category,
          }),
        );
      }
      try {
        await recordAttempt(candidate, now, category, database);
      } catch {
        summary.errors++;
        console.warn(
          "Payment recovery metadata failed",
          JSON.stringify({
            paymentId: candidate.id,
            category: "database_update_failed",
          }),
        );
      }
    },
  );
  return summary;
}
