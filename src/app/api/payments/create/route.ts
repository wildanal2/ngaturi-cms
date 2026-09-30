import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/helpers";
import { getDb } from "@/lib/db";
import { invitations, payments } from "@/lib/db/schema";
import { PLANS, RENEWAL_PRICE, type PaidPlan } from "@/lib/payments/plans";
import {
  createCheckout,
  DOKU_CHECKOUT_DUE_MINUTES,
  isDefinitiveCheckoutRejection,
  isPaymentConfigured,
} from "@/lib/payments/doku";
import { env } from "@/lib/env";

const Body = z.object({
  invitationId: z.string(),
  kind: z.enum(["invitation_unlock", "invitation_renewal"]),
  plan: z.enum(["basic", "premium"]).optional(),
});

export async function POST(req: Request) {
  const db = getDb();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPaymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "Pembayaran online belum aktif. Hubungi tim kami untuk upgrade manual.",
      },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const { invitationId, kind, plan } = parsed.data;

  const tier: PaidPlan = plan ?? "basic";
  const amount =
    kind === "invitation_renewal" ? RENEWAL_PRICE : PLANS[tier].price;
  // Keep invoice_number <= 30 characters for DOKU credit-card compatibility.
  const uniqueReference = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  const orderId = `NG${kind === "invitation_renewal" ? "RNW" : "UNL"}-${uniqueReference}`;
  const itemName =
    kind === "invitation_renewal"
      ? "Perpanjangan undangan 90 hari"
      : `Upgrade undangan ${PLANS[tier].name}`;

  let paymentId: string;
  try {
    paymentId = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.userId, session.user.id),
          ),
        )
        .limit(1)
        .for("update");
      if (!inv) throw new Error("invitation_not_found");
      if (kind === "invitation_unlock" && inv.isPaid) {
        throw new Error("already_paid");
      }
      if (kind === "invitation_renewal" && !inv.isPaid) {
        throw new Error("renewal_requires_paid_invitation");
      }

      const [pending] = await tx
        .select({ id: payments.id, createdAt: payments.createdAt })
        .from(payments)
        .where(
          and(
            eq(payments.invitationId, inv.id),
            eq(payments.provider, "doku"),
            eq(payments.kind, kind),
            eq(payments.status, "pending"),
          ),
        )
        .limit(1);
      if (pending) {
        const retryAfter = new Date(
          Date.now() - (DOKU_CHECKOUT_DUE_MINUTES + 5) * 60_000,
        );
        if (pending.createdAt > retryAfter) {
          throw new Error("payment_in_progress");
        }
        await tx
          .update(payments)
          .set({ status: "expired" })
          .where(
            and(eq(payments.id, pending.id), eq(payments.status, "pending")),
          );
      }

      const [created] = await tx
        .insert(payments)
        .values({
          userId: session.user.id,
          invitationId: inv.id,
          provider: "doku",
          providerOrderId: orderId,
          amount: String(amount),
          currency: "IDR",
          status: "pending",
          kind,
          planTier: kind === "invitation_renewal" ? inv.plan : tier,
          grantUntil: null,
        })
        .returning({ id: payments.id });
      return created.id;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "invitation_not_found") {
      return NextResponse.json(
        { error: "Undangan tidak ditemukan." },
        { status: 404 },
      );
    }
    if (code === "already_paid") {
      return NextResponse.json(
        { error: "Undangan ini sudah aktif." },
        { status: 409 },
      );
    }
    if (code === "renewal_requires_paid_invitation") {
      return NextResponse.json(
        { error: "Hanya undangan berbayar yang dapat diperpanjang." },
        { status: 400 },
      );
    }
    if (code === "payment_in_progress") {
      return NextResponse.json(
        { error: "Pembayaran untuk undangan ini masih diproses." },
        { status: 409 },
      );
    }
    throw error;
  }

  let checkout: Awaited<ReturnType<typeof createCheckout>>;
  try {
    const callbackUrl = new URL(
      env.DOKU_CALLBACK_URL || `${env.BETTER_AUTH_URL}/payment/callback`,
    );
    callbackUrl.searchParams.set("invoice", orderId);
    checkout = await createCheckout({
      orderId,
      amount,
      itemName,
      customer: { name: session.user.name, email: session.user.email },
      callbackUrl: callbackUrl.toString(),
    });
  } catch (error) {
    const definitiveRejection = isDefinitiveCheckoutRejection(error);
    if (definitiveRejection) {
      await db
        .update(payments)
        .set({ status: "failed" })
        .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")));
    }
    console.error(
      "DOKU checkout creation failed",
      JSON.stringify({
        paymentId,
        providerOrderId: orderId,
        category: definitiveRejection
          ? "provider_rejected"
          : "provider_outcome_unknown",
      }),
    );
    return NextResponse.json(
      { error: "Gagal membuat transaksi pembayaran." },
      { status: 502 },
    );
  }

  const providerPaymentId = checkout.sessionId || checkout.tokenId || null;
  if (providerPaymentId) {
    try {
      await db
        .update(payments)
        .set({ providerPaymentId })
        .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")));
    } catch {
      console.warn(
        "DOKU provider reference was not persisted",
        JSON.stringify({
          paymentId,
          providerOrderId: orderId,
          category: "database_update_failed",
        }),
      );
    }
  }
  return NextResponse.json({ redirectUrl: checkout.url });
}
