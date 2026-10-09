import { and, eq } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { invitations, payments } from "@/lib/db/schema";
import { PLANS, RENEWAL_PRICE, type PaidPlan } from "./plans";
import type { PaymentProviderName } from "./provider";
import { unresolvedPaymentCondition } from "./query-policy";

export interface CheckoutPurchase {
  userId: string;
  invitationId: string;
  kind: "invitation_unlock" | "invitation_renewal";
  plan?: PaidPlan;
  provider: PaymentProviderName;
  merchantReference: string;
}

/** Serializes all new attempts for this invitation, across providers. No network I/O. */
export async function reservePaymentAttempt(
  input: CheckoutPurchase,
  database: Database = db,
) {
  return database.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, input.invitationId),
          eq(invitations.userId, input.userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!inv) throw new Error("invitation_not_found");
    if (input.kind === "invitation_unlock" && inv.isPaid)
      throw new Error("already_paid");
    if (input.kind === "invitation_renewal" && !inv.isPaid)
      throw new Error("renewal_requires_paid_invitation");

    const [pending] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.invitationId, inv.id),
          eq(payments.kind, input.kind),
          unresolvedPaymentCondition(),
        ),
      )
      .limit(1);
    if (pending) throw new Error("payment_in_progress");

    const tier = input.plan ?? "basic";
    const amount =
      input.kind === "invitation_renewal" ? RENEWAL_PRICE : PLANS[tier].price;
    const [created] = await tx
      .insert(payments)
      .values({
        userId: input.userId,
        invitationId: inv.id,
        provider: input.provider,
        providerOrderId: input.merchantReference,
        amount: String(amount),
        currency: "IDR",
        status: "pending",
        kind: input.kind,
        planTier: input.kind === "invitation_renewal" ? inv.plan : tier,
        grantUntil: null,
      })
      .returning({ id: payments.id });
    return { id: created.id, amount: String(amount) };
  });
}
