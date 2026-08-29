import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/payments/midtrans";
import { RENEWAL_DAYS } from "@/lib/payments/plans";

const PAID_STATUSES = new Set(["capture", "settlement"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.order_id || !body?.signature_key) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!verifyWebhookSignature(body)) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }

  const [pay] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerOrderId, body.order_id))
    .limit(1);
  if (!pay) {
    return NextResponse.json({ error: "unknown order" }, { status: 404 });
  }
  // idempotent: kalau sudah paid, abaikan
  if (pay.status === "paid") return NextResponse.json({ ok: true });

  const txStatus: string = body.transaction_status;
  const fraud: string = body.fraud_status ?? "accept";
  const now = new Date();

  await db
    .update(payments)
    .set({
      status:
        PAID_STATUSES.has(txStatus) && fraud === "accept"
          ? "paid"
          : txStatus === "expire"
            ? "expired"
            : txStatus === "deny" || txStatus === "cancel"
              ? "failed"
              : "pending",
      providerPaymentId: body.transaction_id ?? null,
      rawWebhook: body,
      paidAt: PAID_STATUSES.has(txStatus) ? now : null,
    })
    .where(eq(payments.id, pay.id));

  if (!(PAID_STATUSES.has(txStatus) && fraud === "accept")) {
    return NextResponse.json({ ok: true });
  }

  // apply grant
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
        businessSubscriptionExpiresAt: new Date(now.getTime() + 30 * 86_400_000),
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, pay.userId));
  }

  return NextResponse.json({ ok: true });
}
