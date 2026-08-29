import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { ButtonLink } from "@/components/ui/button";
import { InvitationCard } from "@/components/dashboard/invitation-card";

export default async function DashboardPage() {
  const session = await requireUser();
  const mine = await db
    .select()
    .from(invitations)
    .where(eq(invitations.userId, session.user.id))
    .orderBy(desc(invitations.updatedAt));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Halo, {session.user.name?.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mine.length} undangan
          </p>
        </div>
        <ButtonLink href="/invitations/new">Buat undangan</ButtonLink>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="text-ink-soft">
            Belum ada undangan. Undangan pertamamu gratis (masa edit 7 hari).
          </p>
          <ButtonLink href="/invitations/new" className="mt-4">
            Mulai dari template
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {mine.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        <Link href="/settings" className="underline">
          Pengaturan akun
        </Link>
      </p>
    </div>
  );
}
