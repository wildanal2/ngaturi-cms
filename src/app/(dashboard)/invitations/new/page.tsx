import Image from "next/image";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { TEMPLATES } from "@/lib/templates/catalog";
import { createInvitation } from "@/lib/invitation/actions";
import { ButtonLink } from "@/components/ui/button";

export default async function NewInvitationPage() {
  const session = await requireUser();
  const [existingFree] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.userId, session.user.id),
        eq(invitations.plan, "free_trial"),
      ),
    )
    .limit(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Pilih template</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Mulai dari desain gratis. Kamu bisa ubah warna, teks, dan urutan bagian
          nanti.
        </p>
      </div>

      {existingFree ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          Kamu sudah punya undangan gratis.{" "}
          <ButtonLink
            href={`/builder/${existingFree.id}`}
            variant="ghost"
            size="sm"
          >
            Lanjut edit
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
              <button className="mt-3 w-full rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600">
                Pakai template ini
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
