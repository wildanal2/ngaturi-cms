import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { isPaymentConfigured } from "@/lib/payments/doku";
import { UnlockOptions } from "@/components/dashboard/unlock-options";

export default async function UnlockPage({
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl">Upgrade undangan</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {inv.isPaid
            ? `Undangan ini sudah paket ${inv.plan}.`
            : "Buka semua fitur, hilangkan watermark, dan edit tanpa batas waktu."}
        </p>
      </div>

      {inv.isPaid ? (
        <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 text-sm">
          Undangan sudah aktif penuh. Tidak ada yang perlu dibayar.
        </div>
      ) : (
        <UnlockOptions
          invitationId={inv.id}
          configured={isPaymentConfigured()}
        />
      )}
    </div>
  );
}
