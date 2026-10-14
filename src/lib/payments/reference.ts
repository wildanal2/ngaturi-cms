import { eq, sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { PaymentResultError } from "./grant";
import type { PaymentProviderName } from "./provider";

/** Never require pending status: the webhook may have settled before creation returns. */
export async function persistProviderReference(
  paymentId: string,
  provider: PaymentProviderName,
  merchantReference: string,
  providerPaymentId: string,
  database: Database = db,
): Promise<void> {
  await database.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1)
      .for("update");
    if (!payment) throw new PaymentResultError("unknown_payment");
    if (payment.provider !== provider)
      throw new PaymentResultError("wrong_provider");
    if (payment.providerOrderId !== merchantReference)
      throw new PaymentResultError("merchant_reference_mismatch");
    if (
      payment.providerPaymentId &&
      payment.providerPaymentId !== providerPaymentId
    ) {
      throw new PaymentResultError("provider_payment_id_mismatch");
    }
    if (!payment.providerPaymentId) {
      await tx
        .update(payments)
        .set({ providerPaymentId })
        .where(eq(payments.id, paymentId));
    }
  });
}

/** Preserve settlement and concurrent audit data while making an accepted-but-unbound create reviewable. */
export async function recordProviderReferenceFailure(
  paymentId: string,
  database: Database = db,
): Promise<void> {
  await database
    .update(payments)
    .set({
      rawWebhook: sql`jsonb_set(coalesce(${payments.rawWebhook}, '{}'::jsonb), '{processing}', coalesce(${payments.rawWebhook}->'processing', '{}'::jsonb) || '{"reviewRequired":true,"category":"provider_reference_persistence_failed"}'::jsonb)`,
    })
    .where(eq(payments.id, paymentId));
}
