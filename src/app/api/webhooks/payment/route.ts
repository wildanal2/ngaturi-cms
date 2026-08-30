import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { verifyNotification } from "@/lib/payments/doku";
import { RENEWAL_DAYS } from "@/lib/payments/plans";

// DOKU notification. status: SUCCESS | FAILED | PENDING | EXPIRED
const PAID = "SUCCESS";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyNotification(req.headers, raw)) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }

  let body: {
    order?: { invoice_number?: string };
    transaction?: { status?: string; original_request_id?: string };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const invoice = body.order?.invoice_number;
  const status = body.transaction?.status ?? "PENDING";
  if (!invoice) {
    return NextResponse.json({ error: "no invoice" }, { status: 400 });
  }

  const [pay] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerOrderId, invoice))
    .limit(1);
  if (!pay) {
    return NextResponse.json({ error: "unknown order" }, { status: 404 });
  }
  if (pay.status === "paid") return NextResponse.json({ ok: true });

  const now = new Date();
  await db
    .update(payments)
    .set({
      status:
        status === PAID
          ? "paid"
          : status === "EXPIRED"
            ? "expired"
            : status === "FAILED"
              ? "failed"
              : "pending",
      rawWebhook: JSON.parse(raw),
      paidAt: status === PAID ? now : null,
    })
    .where(eq(payments.id, pay.id));

  if (status !== PAID) return NextResponse.json({ ok: true });

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
