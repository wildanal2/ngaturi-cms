import { sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { payments } from "@/lib/db/schema";

type PaymentStatus = (typeof payments.$inferSelect)["status"];
type PurchaseKind = (typeof payments.$inferSelect)["kind"];

export type RenewalTier = "basic" | "premium" | "legacyUnknown";

export interface RenewalTierSummary {
  paidAmount: number;
  paidCount: number;
}

export interface PaymentRevenueSummary {
  paidRevenue: number;
  refundedAmount: number;
  renewalPaidAmount: number;
  renewalPaidCount: number;
  renewalByTier: Record<RenewalTier, RenewalTierSummary>;
}

export function summarizePaymentRevenue(
  rows: Array<{
    status: PaymentStatus;
    amount: number;
    kind?: PurchaseKind;
    planTier?: string;
    count?: number;
  }>,
): PaymentRevenueSummary {
  return rows.reduce<PaymentRevenueSummary>(
    (summary, row) => {
      if (row.status === "paid") summary.paidRevenue += row.amount;
      if (row.status === "refunded") summary.refundedAmount += row.amount;
      if (row.status === "paid" && row.kind === "invitation_renewal") {
        const count = row.count ?? 1;
        const tier: RenewalTier =
          row.planTier === "basic" || row.planTier === "premium"
            ? row.planTier
            : "legacyUnknown";
        summary.renewalPaidAmount += row.amount;
        summary.renewalPaidCount += count;
        summary.renewalByTier[tier].paidAmount += row.amount;
        summary.renewalByTier[tier].paidCount += count;
      }
      return summary;
    },
    {
      paidRevenue: 0,
      refundedAmount: 0,
      renewalPaidAmount: 0,
      renewalPaidCount: 0,
      renewalByTier: {
        basic: { paidAmount: 0, paidCount: 0 },
        premium: { paidAmount: 0, paidCount: 0 },
        legacyUnknown: { paidAmount: 0, paidCount: 0 },
      },
    },
  );
}

export async function loadPaymentRevenue(
  database: Database = db,
): Promise<PaymentRevenueSummary> {
  const rows = await database
    .select({
      status: payments.status,
      kind: payments.kind,
      planTier: payments.planTier,
      amount: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .groupBy(payments.status, payments.kind, payments.planTier);
  return summarizePaymentRevenue(rows);
}

export async function loadRefundReviewCount(
  database: Database = db,
): Promise<number> {
  const [row] = await database
    .select({ n: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      sql`coalesce((${payments.refundMetadata}->>'reviewRequired')::boolean, false)
          or coalesce((${payments.refundMetadata}->>'reconciliationRequired')::boolean, false)
          or coalesce((${payments.refundMetadata}->>'entitlementReviewRequired')::boolean, false)`,
    );
  return row?.n ?? 0;
}
