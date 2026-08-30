import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations, userProfiles } from "@/lib/db/schema";
import { ButtonLink } from "@/components/ui/button";
import { InvitationCard } from "@/components/dashboard/invitation-card";
import { maxInvitationsFor } from "@/lib/invitation/entitlement";

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

  const limit = maxInvitationsFor(profile?.bonus);
  const atLimit = mine.length >= limit;
  const showQuotaNotice = (await searchParams).quota === "full";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Undangan</h1>
        {atLimit ? (
          <ButtonLink href="/pricing" variant="outline">
            Tambah kuota
          </ButtonLink>
        ) : (
          <ButtonLink href="/invitations/new">Buat baru</ButtonLink>
        )}
      </div>

      <p className="text-sm text-ink-soft">
        Kuota undangan: {mine.length}/{limit} terpakai.
      </p>

      {showQuotaNotice || atLimit ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          Kuota undangan kamu sudah penuh ({limit}). Beli paket Basic atau Premium
          untuk menambah <strong>+1 kuota</strong> tiap paket.{" "}
          <ButtonLink href="/pricing" variant="ghost" size="sm">
            Lihat paket
          </ButtonLink>
        </div>
      ) : null}

      {mine.length === 0 ? (
        <p className="text-ink-soft">Belum ada undangan.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {mine.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} />
          ))}
        </ul>
      )}
    </div>
  );
}
