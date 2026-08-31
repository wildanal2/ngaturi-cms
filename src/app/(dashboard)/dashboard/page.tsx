import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { ButtonLink } from "@/components/ui/button";
import { InvitationCard } from "@/components/dashboard/invitation-card";
import { getInvitationStats } from "@/lib/invitation/stats";

export default async function DashboardPage() {
  const session = await requireUser();
  const mine = await db
    .select()
    .from(invitations)
    .where(eq(invitations.userId, session.user.id))
    .orderBy(desc(invitations.updatedAt));

  const stats = await getInvitationStats(mine.map((i) => i.id));

  const published = mine.filter((i) => i.status === "published").length;
  const totalAttending = [...stats.values()].reduce((n, s) => n + s.attending, 0);
  const totalMessages = [...stats.values()].reduce((n, s) => n + s.messages, 0);
  const recent = mine.slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">
            Halo, {session.user.name?.split(" ")[0] ?? "kamu"} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mine.length === 0
              ? "Ayo buat undangan digital pertamamu."
              : `${mine.length} undangan · ${published} sudah terbit`}
          </p>
        </div>
        <ButtonLink href="/invitations/new">+ Buat undangan</ButtonLink>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-lg">Mulai dari template</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Undangan pertama gratis. Ganti nama, tanggal, dan foto — lalu
            terbitkan dan bagikan tautannya ke tamu lewat WhatsApp.
          </p>
          <ButtonLink href="/invitations/new" className="mt-5">
            Pilih template
          </ButtonLink>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="Undangan terbit" value={published} />
            <Stat label="Total tamu hadir" value={totalAttending} />
            <Stat label="Total ucapan" value={totalMessages} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Undangan terbaru</h2>
              {mine.length > recent.length ? (
                <Link
                  href="/invitations"
                  className="text-sm text-forest underline"
                >
                  Lihat semua ({mine.length})
                </Link>
              ) : null}
            </div>
            <ul className="grid gap-5 sm:grid-cols-2">
              {recent.map((inv) => (
                <InvitationCard
                  key={inv.id}
                  invitation={inv}
                  appUrl={env.NEXT_PUBLIC_APP_URL}
                  stats={stats.get(inv.id)}
                />
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="text-xs text-muted">
        <Link href="/settings" className="underline">
          Pengaturan akun
        </Link>{" "}
        ·{" "}
        <Link href="/pricing" className="underline">
          Paket &amp; harga
        </Link>
      </p>
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
