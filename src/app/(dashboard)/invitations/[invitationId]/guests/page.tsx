import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { guestInvites, invitations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { GuestManager } from "@/components/dashboard/guest-manager";

export default async function GuestsPage({
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

  const guests = await db
    .select()
    .from(guestInvites)
    .where(eq(guestInvites.invitationId, invitationId))
    .orderBy(desc(guestInvites.createdAt));

  const isPremium = inv.plan === "premium" || inv.plan === "business";
  const baseUrl = `${env.NEXT_PUBLIC_APP_URL}/${inv.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Undangan per-tamu</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Buat tautan personal — nama tamu tampil di sampul, jumlah tamu
          terkontrol.
        </p>
      </div>

      {!isPremium ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          <span>Fitur ini tersedia di paket Premium.</span>
          <a
            href={`/invitations/${inv.id}/unlock`}
            className="rounded-full bg-forest px-4 py-1.5 font-medium text-cream"
          >
            Upgrade ke Premium
          </a>
        </div>
      ) : (
        <GuestManager
          invitationId={inv.id}
          baseUrl={baseUrl}
          guests={guests.map((g) => ({
            id: g.id,
            guestName: g.guestName,
            guestGroup: g.guestGroup,
            slugToken: g.slugToken,
            maxGuests: g.maxGuests,
            whatsappPhone: g.whatsappPhone,
            isSent: g.isSent,
            openedAt: g.openedAt?.toISOString() ?? null,
          }))}
        />
      )}
    </div>
  );
}
