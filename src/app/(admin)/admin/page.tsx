import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, rsvpResponses, users } from "@/lib/db/schema";
import {
  loadPaymentRevenue,
  loadRefundReviewCount,
} from "@/lib/payments/reporting";

export default async function AdminHome() {
  const [[u], [inv], [pub], revenue, refundReviews, [rsvp]] = await Promise.all(
    [
      db.select({ n: sql<number>`count(*)::int` }).from(users),
      db.select({ n: sql<number>`count(*)::int` }).from(invitations),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(invitations)
        .where(sql`${invitations.status} = 'published'`),
      loadPaymentRevenue(db),
      loadRefundReviewCount(db),
      db.select({ n: sql<number>`count(*)::int` }).from(rsvpResponses),
    ],
  );

  const stats = [
    { label: "Pengguna", value: String(u.n) },
    { label: "Undangan", value: String(inv.n) },
    { label: "Terbit", value: String(pub.n) },
    { label: "RSVP masuk", value: String(rsvp.n) },
    {
      label: "Pendapatan dibayar (Rp)",
      value: revenue.paidRevenue.toLocaleString("id-ID"),
    },
    {
      label: "Refund penuh (Rp)",
      value: revenue.refundedAmount.toLocaleString("id-ID"),
    },
    {
      label: "Renewal dibayar (Rp)",
      value: revenue.renewalPaidAmount.toLocaleString("id-ID"),
    },
    { label: "Renewal dibayar", value: String(revenue.renewalPaidCount) },
    {
      label: "Renewal Basic",
      value: `${revenue.renewalByTier.basic.paidCount} · Rp ${revenue.renewalByTier.basic.paidAmount.toLocaleString("id-ID")}`,
    },
    {
      label: "Renewal Premium",
      value: `${revenue.renewalByTier.premium.paidCount} · Rp ${revenue.renewalByTier.premium.paidAmount.toLocaleString("id-ID")}`,
    },
    {
      label: "Renewal legacy/tidak diketahui",
      value: `${revenue.renewalByTier.legacyUnknown.paidCount} · Rp ${revenue.renewalByTier.legacyUnknown.paidAmount.toLocaleString("id-ID")}`,
    },
    { label: "Review refund", value: String(refundReviews) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Ringkasan platform</h1>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-paper p-4"
          >
            <p className="text-2xl font-medium">{s.value}</p>
            <p className="text-sm text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
