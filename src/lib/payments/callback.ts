import { eq } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { applyPaymentObservation } from "./grant";
import { resolvePaymentProvider } from "./registry";

/** Establish a local reference before querying any provider. Browser statuses are ignored. */
export async function resolvePaymentCallback(
  merchantReference: string,
  database: Database = db,
) {
  if (!merchantReference || merchantReference.length > 255) return null;
  const [payment] = await database
    .select()
    .from(payments)
    .where(eq(payments.providerOrderId, merchantReference))
    .limit(1);
  if (!payment || !payment.providerOrderId) return null;
  let status = payment.status;
  try {
    const provider = resolvePaymentProvider(payment.provider);
    const observation = await provider.getPaymentStatus({
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
    });
    status = (
      await applyPaymentObservation(
        observation,
        { source: "status_query", paymentId: payment.id },
        database,
      )
    ).status;
  } catch {
    // A timeout or unavailable lookup never changes financial state. Re-read for an early webhook.
    const [latest] = await database
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.id, payment.id))
      .limit(1);
    status = latest?.status ?? status;
  }
  return {
    invitationId: payment.invitationId,
    status,
    provider: payment.provider,
  };
}
