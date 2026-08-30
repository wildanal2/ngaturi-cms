import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations, payments } from "@/lib/db/schema";
import { PLANS, RENEWAL_PRICE, type PaidPlan } from "@/lib/payments/plans";
import { createCheckout, isPaymentConfigured } from "@/lib/payments/doku";
import { env } from "@/lib/env";

const Body = z.object({
  invitationId: z.string(),
  kind: z.enum(["invitation_unlock", "invitation_renewal"]),
  plan: z.enum(["basic", "premium"]).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPaymentConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran online belum aktif. Hubungi tim kami untuk upgrade manual." },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const { invitationId, kind, plan } = parsed.data;

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
  if (!inv) {
    return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
  }

  const tier: PaidPlan = plan ?? "basic";
  const amount =
    kind === "invitation_renewal" ? RENEWAL_PRICE : PLANS[tier].price;
  // invoice_number: alphanumeric + dash, <= 64
  const orderId = `NG${kind === "invitation_renewal" ? "RNW" : "UNL"}-${inv.id.slice(0, 8)}-${Date.now()}`;
  const itemName =
    kind === "invitation_renewal"
      ? "Perpanjangan undangan 90 hari"
      : `Upgrade undangan ${PLANS[tier].name}`;

  await db.insert(payments).values({
    userId: session.user.id,
    invitationId: inv.id,
    provider: "doku",
    providerOrderId: orderId,
    amount: String(amount),
    currency: "IDR",
    status: "pending",
    kind,
    planTier: kind === "invitation_renewal" ? "renewal" : tier,
  });

  try {
    const checkout = await createCheckout({
      orderId,
      amount,
      itemName,
      customer: { name: session.user.name, email: session.user.email },
      callbackUrl:
        env.DOKU_CALLBACK_URL ||
        `${env.NEXT_PUBLIC_APP_URL}/payment/callback`,
    });
    const providerPaymentId = checkout.sessionId || checkout.tokenId || null;
    if (providerPaymentId) {
      await db
        .update(payments)
        .set({ providerPaymentId })
        .where(eq(payments.providerOrderId, orderId));
    }
    return NextResponse.json({ redirectUrl: checkout.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membuat transaksi." },
      { status: 502 },
    );
  }
}
