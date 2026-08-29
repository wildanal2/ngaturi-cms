import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { ButtonLink } from "@/components/ui/button";
import { InvitationCard } from "@/components/dashboard/invitation-card";

export default async function InvitationsPage() {
  const session = await requireUser();
  const mine = await db
    .select()
    .from(invitations)
    .where(eq(invitations.userId, session.user.id))
    .orderBy(desc(invitations.updatedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Undangan</h1>
        <ButtonLink href="/invitations/new">Buat baru</ButtonLink>
      </div>
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
