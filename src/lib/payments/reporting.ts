import { sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { payments } from "@/lib/db/schema";

type PaymentStatus = (typeof payments.$inferSelect)["status"];

export interface PaymentRevenueSummary {
  paidRevenue: number;
  refundedAmount: number;
}

export function summarizePaymentRevenue(
  rows: Array<{ status: PaymentStatus; amount: number }>,
): PaymentRevenueSummary {
  return rows.reduce<PaymentRevenueSummary>(
    (summary, row) => {
      if (row.status === "paid") summary.paidRevenue += row.amount;
      if (row.status === "refunded") summary.refundedAmount += row.amount;
      return summary;
    },
    { paidRevenue: 0, refundedAmount: 0 },
  );
}

export async function loadPaymentRevenue(
  database: Database = db,
): Promise<PaymentRevenueSummary> {
  const rows = await database
    .select({
      status: payments.status,
      amount: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
    })
    .from(payments)
    .groupBy(payments.status);
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
