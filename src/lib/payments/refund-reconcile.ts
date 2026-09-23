import { db, type Database } from "@/lib/db";
import { checkOrderStatus } from "./doku";
import { applyDokuResult, type AppliedPaymentResult } from "./grant";

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
  const result = await checkStatus(invoiceNumber);
  return applyResult(result, { source: "operator_reconciliation" }, database);
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
  const result = await checkStatus(invoiceNumber);
  if (result.status !== "REFUNDED") {
    return { outcome: "not_refunded", providerStatus: result.status };
  }

  return {
    outcome: "processed",
    payment: await applyResult(
      result,
      { source: "refund_reconciliation" },
      database,
    ),
  };
}
