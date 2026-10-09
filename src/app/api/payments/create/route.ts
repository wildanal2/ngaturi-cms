import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/helpers";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { PLANS } from "@/lib/payments/plans";
import { reservePaymentAttempt } from "@/lib/payments/checkout";
import { resolveCheckoutProvider } from "@/lib/payments/registry";
import {
  PaymentProviderError,
  type PaymentProvider,
} from "@/lib/payments/provider";
import {
  persistProviderReference,
  recordProviderReferenceFailure,
} from "@/lib/payments/reference";
import { env } from "@/lib/env";

const Body = z.object({
  invitationId: z.string(),
  kind: z.enum(["invitation_unlock", "invitation_renewal"]),
  plan: z.enum(["basic", "premium"]).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  let provider: PaymentProvider;
  try {
    provider = resolveCheckoutProvider();
    if (!provider.isConfigured())
      throw new PaymentProviderError("payment_not_configured", "unavailable");
  } catch {
    return NextResponse.json(
      {
        error:
          "Pembayaran online belum aktif. Hubungi tim kami untuk upgrade manual.",
      },
      { status: 503 },
    );
  }
  const db = getDb();
  const { invitationId, kind, plan } = parsed.data;
  // Keep durable references <=30 ASCII characters for historical DOKU compatibility.
  const orderId = `NG${kind === "invitation_renewal" ? "RNW" : "UNL"}-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  let payment: Awaited<ReturnType<typeof reservePaymentAttempt>>;
  try {
    payment = await reservePaymentAttempt(
      {
        userId: session.user.id,
        invitationId,
        kind,
        plan,
        provider: provider.name,
        merchantReference: orderId,
      },
      db,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const errors: Record<string, [number, string]> = {
      invitation_not_found: [404, "Undangan tidak ditemukan."],
      already_paid: [409, "Undangan ini sudah aktif."],
      renewal_requires_paid_invitation: [
        400,
        "Hanya undangan berbayar yang dapat diperpanjang.",
      ],
      payment_in_progress: [
        409,
        "Pembayaran untuk undangan ini masih diproses.",
      ],
    };
    if (Object.hasOwn(errors, code)) {
      const [status, message] = errors[code];
      return NextResponse.json({ error: message }, { status });
    }
    throw error;
  }

  const callbackUrl = new URL("/payment/callback", env.BETTER_AUTH_URL);
  callbackUrl.searchParams.set("invoice", orderId);
  let created;
  try {
    // The durable attempt transaction has committed before this external request.
    created = await provider.createPayment({
      merchantReference: orderId,
      amount: payment.amount,
      currency: "IDR",
      itemName:
        kind === "invitation_renewal"
          ? "Perpanjangan undangan 90 hari"
          : `Upgrade undangan ${PLANS[plan ?? "basic"].name}`,
      customer: { name: session.user.name, email: session.user.email },
      callbackUrl: callbackUrl.toString(),
    });
  } catch (error) {
    const rejected =
      error instanceof PaymentProviderError && error.outcome === "rejected";
    if (rejected) {
      await db
        .update(payments)
        .set({
          status: "failed",
          rawWebhook: {
            creation: { outcome: "rejected", provider: provider.name },
          },
        })
        .where(
          and(eq(payments.id, payment.id), eq(payments.status, "pending")),
        );
    }
    console.error(
      "Payment creation failed",
      JSON.stringify({
        paymentId: payment.id,
        provider: provider.name,
        category: rejected ? "provider_rejected" : "provider_outcome_unknown",
      }),
    );
    return NextResponse.json(
      { error: "Gagal membuat transaksi pembayaran." },
      { status: 502 },
    );
  }

  if (created.providerPaymentId) {
    try {
      await persistProviderReference(
        payment.id,
        provider.name,
        orderId,
        created.providerPaymentId,
        db,
      );
    } catch {
      try {
        await recordProviderReferenceFailure(payment.id, db);
      } catch {
        /* Safe log below; the durable attempt remains unresolved. */
      }
      console.warn(
        "Provider reference was not persisted",
        JSON.stringify({
          paymentId: payment.id,
          provider: provider.name,
          category: "reference_persistence_failed",
        }),
      );
      return NextResponse.json(
        { error: "Transaksi sedang diverifikasi. Jangan ulangi pembayaran." },
        { status: 502 },
      );
    }
  }
  return NextResponse.json({ redirectUrl: created.redirectUrl });
}
