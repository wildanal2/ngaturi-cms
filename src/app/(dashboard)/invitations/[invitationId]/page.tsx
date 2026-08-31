import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  guestbookMessages,
  invitations,
  invitationViews,
  rsvpResponses,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { moderateMessage } from "@/lib/invitation/moderation";
import { ShareBox } from "@/components/dashboard/share-box";
import { ViewsChart } from "@/components/dashboard/views-chart";

export default async function InvitationDetailPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const session = await requireUser();

  const [inv] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!inv) notFound();

  // server component: runs once per request, not per React render
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const since = new Date(nowMs - 14 * 86_400_000);
  const [rsvps, messages, viewRows] = await Promise.all([
    db
      .select()
      .from(rsvpResponses)
      .where(eq(rsvpResponses.invitationId, invitationId))
      .orderBy(desc(rsvpResponses.createdAt)),
    db
      .select()
      .from(guestbookMessages)
      .where(eq(guestbookMessages.invitationId, invitationId))
      .orderBy(desc(guestbookMessages.createdAt)),
    db
      .select({
        day: sql<string>`to_char(${invitationViews.viewedAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(invitationViews)
      .where(
        and(
          eq(invitationViews.invitationId, invitationId),
          gte(invitationViews.viewedAt, since),
        ),
      )
      .groupBy(sql`1`),
  ]);

  const attending = rsvps
    .filter((r) => r.status === "attending")
    .reduce((n, r) => n + r.guestCount, 0);
  const url = `${env.NEXT_PUBLIC_APP_URL}/${inv.slug}`;

  const days = last14Days(
    new Map(viewRows.map((r) => [r.day, r.count])),
    nowMs,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">{inv.eventTitle ?? inv.slug}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {inv.status === "published" ? "Terbit" : "Belum terbit"} ·{" "}
          {inv.viewCount} kunjungan
        </p>
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={`/builder/${inv.id}`}
            className="rounded-full bg-forest px-3.5 py-1.5 font-medium text-cream"
          >
            Edit undangan
          </Link>
          <Link
            href={`/invitations/${inv.id}/guests`}
            className="rounded-full border border-line px-3.5 py-1.5 hover:bg-cream-200"
          >
            Undangan per-tamu
          </Link>
          {!inv.isPaid ? (
            <Link
              href={`/invitations/${inv.id}/unlock`}
              className="rounded-full border border-line px-3.5 py-1.5 hover:bg-cream-200"
            >
              Upgrade
            </Link>
          ) : null}
        </nav>
      </div>

      {!inv.isPaid ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          <span>
            Paket <b>Gratis</b> — ada watermark &amp; masa edit 3 hari.
          </span>
          <a
            href={`/invitations/${inv.id}/unlock`}
            className="rounded-full bg-forest px-4 py-1.5 font-medium text-cream"
          >
            Upgrade
          </a>
        </div>
      ) : null}

      {inv.status === "published" ? <ShareBox url={url} /> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total RSVP" value={rsvps.length} />
        <Stat label="Konfirmasi hadir" value={attending} />
        <Stat label="Ucapan" value={messages.length} />
      </section>

      <section>
        <h2 className="mb-3 text-lg">Kunjungan 14 hari terakhir</h2>
        <ViewsChart data={days} />
      </section>

      <section>
        <h2 className="mb-3 text-lg">Daftar RSVP</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-left text-ink-soft">
              <tr>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tamu</th>
                <th className="px-3 py-2">Ucapan</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.guestCount}</td>
                  <td className="px-3 py-2 text-ink-soft">{r.message}</td>
                </tr>
              ))}
              {rsvps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted">
                    Belum ada RSVP.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Ucapan &amp; moderasi</h2>
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-line bg-paper p-4 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted">{m.status}</span>
              </div>
              <p className="mt-1 text-ink-soft">{m.message}</p>
              {m.status === "pending" || m.status === "spam" ? (
                <div className="mt-2 flex gap-2">
                  <form action={moderateMessage.bind(null, m.id, "approve")}>
                    <button className="rounded-full bg-forest px-3 py-1 text-xs text-cream">
                      Setujui
                    </button>
                  </form>
                  <form action={moderateMessage.bind(null, m.id, "reject")}>
                    <button className="rounded-full border border-line px-3 py-1 text-xs">
                      Tolak
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
          {messages.length === 0 ? (
            <li className="text-muted">Belum ada ucapan.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function last14Days(viewMap: Map<string, number>, nowMs: number) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(nowMs - (13 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      count: viewMap.get(key) ?? 0,
    };
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-2xl font-medium">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
