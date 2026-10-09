import { db, type Database } from "@/lib/db";
import { eq } from "drizzle-orm";
import { payments } from "@/lib/db/schema";
import { checkOrderStatus } from "./doku";
import { PaymentResultError, type AppliedPaymentResult } from "./grant";
import { applyDokuResult } from "./legacy-doku";

async function localDokuPayment(
  invoiceNumber: string,
  database: Database,
  refund = false,
) {
  const [payment] = await database
    .select({ id: payments.id, provider: payments.provider })
    .from(payments)
    .where(eq(payments.providerOrderId, invoiceNumber))
    .limit(1);
  if (!payment) throw new PaymentResultError("unknown_payment");
  if (payment.provider !== "doku")
    throw new PaymentResultError(
      refund ? "unsupported_refund" : "wrong_provider",
    );
  return payment;
}

export type RefundReconciliationResult =
  | { outcome: "not_refunded"; providerStatus: string }
  | { outcome: "processed"; payment: AppliedPaymentResult };

/**
 * Fetch and apply one fresh, signed provider status after an operator has
 * rejected refund evidence. Only this provider result may resume fulfillment.
 */
export async function reconcileDokuPaymentReference(
  invoiceNumber: string,
  database: Database = db,
  checkStatus: typeof checkOrderStatus = checkOrderStatus,
  applyResult: typeof applyDokuResult = applyDokuResult,
): Promise<AppliedPaymentResult> {
  const payment = await localDokuPayment(invoiceNumber, database);
  const result = await checkStatus(invoiceNumber);
  return applyResult(
    result,
    { source: "operator_reconciliation", paymentId: payment.id },
    database,
  );
}

/**
 * Operator-triggered recovery for one known invoice. This is intentionally
 * separate from pending-payment cron reconciliation: refunds concern settled
 * or otherwise terminal orders and must never broaden that cron's candidate set.
 */
export async function reconcileDokuRefund(
  invoiceNumber: string,
  database: Database = db,
  checkStatus: typeof checkOrderStatus = checkOrderStatus,
  applyResult: typeof applyDokuResult = applyDokuResult,
): Promise<RefundReconciliationResult> {
  const payment = await localDokuPayment(invoiceNumber, database, true);
  const result = await checkStatus(invoiceNumber);
  if (result.status !== "REFUNDED") {
    return { outcome: "not_refunded", providerStatus: result.status };
  }

  return {
    outcome: "processed",
    payment: await applyResult(
      result,
      { source: "refund_reconciliation", paymentId: payment.id },
      database,
    ),
  };
}
