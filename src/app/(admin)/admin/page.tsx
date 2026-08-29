import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invitations,
  payments,
  rsvpResponses,
  users,
} from "@/lib/db/schema";

export default async function AdminHome() {
  const [[u], [inv], [pub], [pay], [rsvp]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(invitations),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(invitations)
      .where(sql`${invitations.status} = 'published'`),
    db
      .select({ n: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments)
      .where(sql`${payments.status} = 'paid'`),
    db.select({ n: sql<number>`count(*)::int` }).from(rsvpResponses),
  ]);

  const stats = [
    { label: "Pengguna", value: String(u.n) },
    { label: "Undangan", value: String(inv.n) },
    { label: "Terbit", value: String(pub.n) },
    { label: "RSVP masuk", value: String(rsvp.n) },
    { label: "Pendapatan (Rp)", value: pay.n.toLocaleString("id-ID") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Ringkasan platform</h1>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
