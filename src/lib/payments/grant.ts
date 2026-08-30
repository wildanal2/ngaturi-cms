import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { PAID_PACKAGE_QUOTA_BONUS } from "@/lib/invitation/entitlement";
import { RENEWAL_DAYS } from "./plans";
import { mapStatus, type DokuStatus } from "./doku";

/**
 * Idempotently record a DOKU status against a payment row and, on success,
 * apply the entitlement. Safe to call from the webhook and the return page.
 */
export async function applyDokuResult(
  invoiceNumber: string,
  dokuStatus: DokuStatus,
  raw?: unknown,
): Promise<"paid" | "expired" | "failed" | "pending" | "unknown"> {
  const [pay] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerOrderId, invoiceNumber))
    .limit(1);
  if (!pay) return "unknown";
  if (pay.status === "paid") return "paid";

  const status = mapStatus(dokuStatus);
  const now = new Date();

  await db
    .update(payments)
    .set({
      status,
      rawWebhook: (raw ?? { transaction: { status: dokuStatus } }) as object,
      paidAt: status === "paid" ? now : null,
    })
    .where(eq(payments.id, pay.id));

  if (status !== "paid") return status;

  if (pay.kind === "invitation_unlock" && pay.invitationId) {
    await db
      .update(invitations)
      .set({
        isPaid: true,
        plan: pay.planTier === "premium" ? "premium" : "basic",
        hasWatermark: false,
        isEditLocked: false,
        editExpiresAt: null,
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(invitations.id, pay.invitationId));

    // Beli paket = +1 kuota untuk bikin undangan berikutnya.
    if (pay.userId) {
      await db
        .insert(userProfiles)
        .values({
          userId: pay.userId,
          invitationQuotaBonus: PAID_PACKAGE_QUOTA_BONUS,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            invitationQuotaBonus: sql`${userProfiles.invitationQuotaBonus} + ${PAID_PACKAGE_QUOTA_BONUS}`,
            updatedAt: now,
          },
        });
    }
  } else if (pay.kind === "invitation_renewal" && pay.invitationId) {
    const [inv] = await db
      .select({ expiresAt: invitations.expiresAt })
      .from(invitations)
      .where(eq(invitations.id, pay.invitationId))
      .limit(1);
    const base = inv?.expiresAt && inv.expiresAt > now ? inv.expiresAt : now;
    await db
      .update(invitations)
      .set({
        status: "published",
        expiresAt: new Date(base.getTime() + RENEWAL_DAYS * 86_400_000),
        updatedAt: now,
      })
      .where(eq(invitations.id, pay.invitationId));
  } else if (pay.kind === "business_subscription" && pay.userId) {
    await db
      .update(userProfiles)
      .set({
        businessSubscriptionExpiresAt: new Date(
          now.getTime() + 30 * 86_400_000,
        ),
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, pay.userId));
  }
  return "paid";
}

export async function invitationIdForInvoice(
  invoiceNumber: string,
): Promise<string | null> {
  const [pay] = await db
    .select({ invitationId: payments.invitationId })
    .from(payments)
    .where(eq(payments.providerOrderId, invoiceNumber))
    .limit(1);
  return pay?.invitationId ?? null;
}
