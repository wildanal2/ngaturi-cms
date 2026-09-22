import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { checkOrderStatus } from "./doku";
import {
  applyDokuResult,
  type AppliedPaymentResult,
  type PaymentResultStatus,
} from "./grant";

export const DOKU_RECONCILIATION_MIN_AGE_MINUTES = 2;
export const DOKU_RECONCILIATION_MAX_AGE_HOURS = 24;
export const DOKU_RECONCILIATION_BATCH_SIZE = 50;
export const DOKU_RECONCILIATION_CONCURRENCY = 5;

interface PendingDokuPayment {
  id: string;
  providerOrderId: string;
}

interface ReconciliationWindow {
  oldestCreatedAt: Date;
  newestCreatedAt: Date;
  limit: number;
}

type CandidateLoader = (
  window: ReconciliationWindow,
) => Promise<PendingDokuPayment[]>;

interface ReconciliationDependencies {
  now?: Date;
  loadCandidates?: CandidateLoader;
  checkStatus?: typeof checkOrderStatus;
  applyResult?: typeof applyDokuResult;
}

export interface DokuReconciliationSummary {
  selected: number;
  checked: number;
  transitioned: number;
  fulfilled: number;
  statuses: Record<PaymentResultStatus, number>;
  errors: number;
  truncated: boolean;
}

export async function loadPendingDokuPayments({
  oldestCreatedAt,
  newestCreatedAt,
  limit,
}: ReconciliationWindow): Promise<PendingDokuPayment[]> {
  const rows = await db
    .select({
      id: payments.id,
      providerOrderId: payments.providerOrderId,
    })
    .from(payments)
    .where(
      and(
        eq(payments.provider, "doku"),
        eq(payments.status, "pending"),
        eq(payments.currency, "IDR"),
        isNotNull(payments.providerOrderId),
        gte(payments.createdAt, oldestCreatedAt),
        lte(payments.createdAt, newestCreatedAt),
      ),
    )
    .orderBy(asc(payments.createdAt))
    .limit(limit);

  return rows.filter(
    (row): row is PendingDokuPayment => row.providerOrderId !== null,
  );
}

function errorCategory(error: unknown): string {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "provider_or_processing_error";
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await task(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
}

/**
 * Reconcile recent pending DOKU payments through signed Check Status results.
 * Every accepted result is applied by the same atomic path as the webhook and
 * browser callback.
 */
export async function reconcilePendingDokuPayments(
  dependencies: ReconciliationDependencies = {},
): Promise<DokuReconciliationSummary> {
  const now = dependencies.now ?? new Date();
  const loadCandidates = dependencies.loadCandidates ?? loadPendingDokuPayments;
  const checkStatus = dependencies.checkStatus ?? checkOrderStatus;
  const applyResult = dependencies.applyResult ?? applyDokuResult;
  const queryLimit = DOKU_RECONCILIATION_BATCH_SIZE + 1;

  const rows = await loadCandidates({
    oldestCreatedAt: new Date(
      now.getTime() - DOKU_RECONCILIATION_MAX_AGE_HOURS * 3_600_000,
    ),
    newestCreatedAt: new Date(
      now.getTime() - DOKU_RECONCILIATION_MIN_AGE_MINUTES * 60_000,
    ),
    limit: queryLimit,
  });
  const truncated = rows.length > DOKU_RECONCILIATION_BATCH_SIZE;
  const candidates = rows.slice(0, DOKU_RECONCILIATION_BATCH_SIZE);
  const summary: DokuReconciliationSummary = {
    selected: candidates.length,
    checked: 0,
    transitioned: 0,
    fulfilled: 0,
    statuses: { paid: 0, expired: 0, failed: 0, pending: 0 },
    errors: 0,
    truncated,
  };

  await runWithConcurrency(
    candidates,
    DOKU_RECONCILIATION_CONCURRENCY,
    async (candidate) => {
      try {
        const result = await checkStatus(candidate.providerOrderId);
        const applied: AppliedPaymentResult = await applyResult(result, {
          source: "reconciliation",
        });
        summary.checked += 1;
        summary.statuses[applied.status] += 1;
        if (applied.transitioned) summary.transitioned += 1;
        if (applied.fulfilled) summary.fulfilled += 1;
      } catch (error) {
        summary.errors += 1;
        console.warn(
          "DOKU reconciliation candidate failed",
          JSON.stringify({
            paymentId: candidate.id,
            category: errorCategory(error),
          }),
        );
      }
    },
  );

  return summary;
}
