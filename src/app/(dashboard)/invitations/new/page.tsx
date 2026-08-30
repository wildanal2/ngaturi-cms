import Image from "next/image";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations, userProfiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { TEMPLATES } from "@/lib/templates/catalog";
import { createInvitation } from "@/lib/invitation/actions";
import { maxInvitationsFor } from "@/lib/invitation/entitlement";
import { ButtonLink } from "@/components/ui/button";

export default async function NewInvitationPage() {
  const session = await requireUser();
  const [[{ count }], [profile]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invitations)
      .where(eq(invitations.userId, session.user.id)),
    db
      .select({ bonus: userProfiles.invitationQuotaBonus })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1),
  ]);
  const limit = maxInvitationsFor(profile?.bonus);
  const atLimit = count >= limit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Pilih template</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Akun gratis bisa membuat 1 undangan (masa edit 3 hari). Beli paket
          Basic/Premium untuk menambah +1 kuota tiap paket.
        </p>
      </div>

      {atLimit ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          Kuota undangan kamu sudah penuh ({count}/{limit}). Tambah kapasitas
          dengan membeli paket.{" "}
          <ButtonLink href="/pricing" variant="ghost" size="sm">
            Lihat paket
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <form
            key={t.id}
            action={createInvitation.bind(null, t.id)}
            className="overflow-hidden rounded-2xl border border-line bg-paper"
          >
            <Image
              src={t.thumbnail}
              alt={t.name}
              width={400}
              height={300}
              className="aspect-[4/3] w-full object-cover"
              unoptimized
            />
            <div className="p-4">
              <h3 className="text-lg">{t.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{t.description}</p>
              <button
                disabled={atLimit}
                className="mt-3 w-full rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:opacity-50"
              >
                Pakai template ini
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
