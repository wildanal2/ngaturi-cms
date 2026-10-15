import { and, asc, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import {
  applyPaymentObservation,
  PaymentResultError,
  type AppliedPaymentResult,
} from "./grant";
import {
  PaymentProviderError,
  type PaymentProvider,
  type PaymentResultStatus,
} from "./provider";
import {
  resolvePaymentProvider,
  statusReconciliationProviders,
} from "./registry";
import { unresolvedPaymentCondition } from "./query-policy";
import { asRecord, isLegacyLocalExpiration } from "./processing-metadata";

export const RECONCILIATION_MIN_AGE_MINUTES = 2;
export const RECONCILIATION_BATCH_SIZE = 50;
export const RECONCILIATION_CONCURRENCY = 5;

// Also recognize records written before the explicit retryable flag existed.
const PERMANENT_CATEGORIES = [
  "sumopod_status_contract_missing",
  "unsupported_payment_provider",
  "status_reconciliation_unsupported",
  "missing_merchant_reference",
  "payment_not_configured",
  "unsupported_currency",
  "unknown_payment",
  "wrong_provider",
  "amount_mismatch",
  "currency_mismatch",
  "merchant_reference_mismatch",
  "provider_payment_id_mismatch",
  "unsupported_refund",
  "review_required",
];

function retryableReconciliationCondition() {
  return and(
    sql`coalesce(${payments.rawWebhook}->'reconciliation'->>'retryable', 'true') <> 'false'`,
    sql`coalesce(${payments.rawWebhook}->'reconciliation'->>'category', '') not in (${sql.join(
      PERMANENT_CATEGORIES.map((category) => sql`${category}`),
      sql`, `,
    )})`,
  );
}

function requiresManualReview(candidate: ReconciliationCandidate): boolean {
  const record = asRecord(asRecord(candidate.rawWebhook).reconciliation);
  return (
    record.retryable === false ||
    (typeof record.category === "string" &&
      PERMANENT_CATEGORIES.includes(record.category))
  );
}

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
  skipped: number;
  unsupportedProvider: number;
  permanentFailures: number;
  aged: number;
  missingReference: number;
  unavailableProvider: number;
  statuses: Record<PaymentResultStatus, number>;
  /** Retryable provider/internal failures only; expected review/skips are not errors. */
  errors: number;
  truncated: boolean;
}

export async function loadUnresolvedPayments(
  { newestCreatedAt, limit }: ReconciliationWindow,
  database: Database = db,
): Promise<ReconciliationCandidate[]> {
  const providers = statusReconciliationProviders();
  if (providers.length === 0) return [];
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
        inArray(payments.provider, providers),
        isNotNull(payments.providerOrderId),
        ne(payments.providerOrderId, ""),
        retryableReconciliationCondition(),
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
  retryable = true,
): Promise<void> {
  const record = JSON.stringify({
    attemptedAt: attemptedAt.toISOString(),
    category,
    retryable,
  });
  const base = isLegacyLocalExpiration(candidate)
    ? sql`jsonb_set(coalesce(${payments.rawWebhook}, '{}'::jsonb), '{processing}', coalesce(${payments.rawWebhook}->'processing', '{}'::jsonb) || '{"legacyExpirationRecovery":true}'::jsonb)`
    : sql`coalesce(${payments.rawWebhook}, '{}'::jsonb)`;
  await database
    .update(payments)
    .set({
      rawWebhook: sql`jsonb_set(${base}, '{reconciliation}', ${record}::jsonb)`,
    })
    .where(
      and(
        eq(payments.id, candidate.id),
        unresolvedPaymentCondition(),
        retryableReconciliationCondition(),
      ),
    );
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

/** Manual/bounded recovery by stored provider; never infer expiration from age. */
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
    skipped: 0,
    unsupportedProvider: 0,
    permanentFailures: 0,
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
      const skip = (category: string) => {
        summary.skipped++;
        summary.reviewRequired++;
        console.info(
          "Payment reconciliation skipped",
          JSON.stringify({
            paymentId: candidate.id,
            provider: candidate.provider,
            category,
          }),
        );
      };
      if (requiresManualReview(candidate)) {
        skip("permanent_review_required");
        return;
      }
      if (!candidate.providerOrderId) {
        summary.missingReference++;
        skip("missing_merchant_reference");
        return;
      }
      let provider: PaymentProvider;
      try {
        provider = resolveProvider(candidate.provider);
      } catch (error) {
        if (
          !(error instanceof PaymentProviderError) ||
          error.outcome === "unknown"
        )
          throw error;
        summary.unavailableProvider++;
        skip(error.code);
        return;
      }
      // Fail closed: method existence is never proof of a supported contract.
      if (provider.supportsStatusReconciliation !== true) {
        summary.unsupportedProvider++;
        skip("status_reconciliation_unsupported");
        return;
      }
      let category = "checking";
      let retryable = true;
      try {
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
        retryable = !applied.reviewRequired;
      } catch (error) {
        category = errorCategory(error);
        retryable = !(
          PERMANENT_CATEGORIES.includes(category) ||
          error instanceof PaymentResultError ||
          (error instanceof PaymentProviderError && error.outcome !== "unknown")
        );
        if (retryable) summary.errors++;
        else {
          summary.permanentFailures++;
          summary.reviewRequired++;
        }
        if (
          error instanceof PaymentProviderError &&
          error.outcome === "unavailable"
        ) {
          summary.unavailableProvider++;
        }
        console.warn(
          retryable
            ? "Payment reconciliation transient failure"
            : "Payment reconciliation review required",
          JSON.stringify({
            paymentId: candidate.id,
            provider: candidate.provider,
            category,
            retryable,
          }),
        );
      }
      try {
        // One durable attempt rotates transient failures; permanent reviews are excluded next time.
        await recordAttempt(candidate, now, category, database, retryable);
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
