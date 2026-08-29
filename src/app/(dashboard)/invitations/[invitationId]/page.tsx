import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  guestbookMessages,
  invitations,
  rsvpResponses,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { moderateMessage } from "@/lib/invitation/moderation";
import { ShareBox } from "@/components/dashboard/share-box";

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

  const [rsvps, messages] = await Promise.all([
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
  ]);

  const attending = rsvps
    .filter((r) => r.status === "attending")
    .reduce((n, r) => n + r.guestCount, 0);
  const url = `${env.NEXT_PUBLIC_APP_URL}/${inv.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">{inv.eventTitle ?? inv.slug}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {inv.status === "published" ? "Terbit" : "Belum terbit"} ·{" "}
          {inv.viewCount} kunjungan
        </p>
      </div>

      {inv.status === "published" ? <ShareBox url={url} /> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total RSVP" value={rsvps.length} />
        <Stat label="Konfirmasi hadir" value={attending} />
        <Stat label="Ucapan" value={messages.length} />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-2xl font-medium">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
