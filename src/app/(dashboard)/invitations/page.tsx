import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations, userProfiles } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { ButtonLink } from "@/components/ui/button";
import { InvitationCard } from "@/components/dashboard/invitation-card";
import { maxInvitationsFor } from "@/lib/invitation/entitlement";
import { getInvitationStats } from "@/lib/invitation/stats";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ quota?: string }>;
}) {
  const session = await requireUser();
  const [mine, [profile]] = await Promise.all([
    db
      .select()
      .from(invitations)
      .where(eq(invitations.userId, session.user.id))
      .orderBy(desc(invitations.updatedAt)),
    db
      .select({ bonus: userProfiles.invitationQuotaBonus })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1),
  ]);

  const stats = await getInvitationStats(mine.map((i) => i.id));

  const limit = maxInvitationsFor(profile?.bonus);
  const used = mine.length;
  const atLimit = used >= limit;
  const showQuotaNotice = (await searchParams).quota === "full";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Undangan Saya</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Kelola undangan, bagikan tautannya, dan pantau kehadiran tamu.
          </p>
        </div>
        {atLimit ? (
          <ButtonLink href="/pricing" variant="outline">
            Tambah kuota
          </ButtonLink>
        ) : (
          <ButtonLink href="/invitations/new">+ Buat undangan</ButtonLink>
        )}
      </header>

      {/* quota meter */}
      <div className="rounded-xl border border-line bg-paper p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-soft">
            Kuota undangan: <b className="text-ink">{used}</b> dari {limit} terpakai
          </span>
          {!atLimit ? (
            <span className="text-xs text-muted">
              Sisa {limit - used} slot
            </span>
          ) : null}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
          <div
            className={`h-full rounded-full ${atLimit ? "bg-gold" : "bg-forest"}`}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
      </div>

      {showQuotaNotice || atLimit ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          <p className="font-medium">Kuota undangan sudah penuh</p>
          <p className="mt-1 text-ink-soft">
            Akun gratis bisa membuat 1 undangan. Beli paket Basic atau Premium —
            setiap pembelian menambah <b>+1 kuota</b> sekaligus menghapus
            watermark & membuka masa edit undangan itu.
          </p>
          <ButtonLink href="/pricing" size="sm" className="mt-3">
            Lihat paket
          </ButtonLink>
        </div>
      ) : null}

      {used === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-lg">Belum ada undangan</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Buat undangan pertamamu gratis. Pilih template, ganti nama & foto,
            lalu terbitkan — semua tanpa perlu keahlian desain.
          </p>
          <ol className="mx-auto mt-4 flex max-w-xs flex-col gap-1.5 text-left text-xs text-muted">
            <li>1. Pilih desain template</li>
            <li>2. Isi nama, tanggal, lokasi, foto</li>
            <li>3. Terbitkan & bagikan ke tamu</li>
          </ol>
          <ButtonLink href="/invitations/new" className="mt-5">
            Pilih template
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {mine.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              appUrl={env.NEXT_PUBLIC_APP_URL}
              stats={stats.get(inv.id)}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Butuh bantuan? Lihat{" "}
        <Link href="/pricing" className="underline">
          paket &amp; harga
        </Link>{" "}
        atau hubungi tim kami.
      </p>
    </div>
  );
}
