import {
  resolveRefundReview,
  type RefundReviewDecision,
} from "../src/lib/payments/refund-review";
import { reconcileDokuPaymentReference } from "../src/lib/payments/refund-reconcile";

const [providerOrderIdRaw, decisionRaw, operatorRaw, ...reasonParts] =
  process.argv.slice(2);
const providerOrderId = providerOrderIdRaw?.trim();
const decision = decisionRaw?.trim() as RefundReviewDecision | undefined;
const operator = operatorRaw?.trim();
const reason = reasonParts.join(" ").trim();

if (
  !providerOrderId ||
  (decision !== "confirm" && decision !== "reject") ||
  !operator ||
  !reason
) {
  console.error(
    "Usage: npm run payments:resolve-refund-review -- <provider_order_id> <confirm|reject> <operator_id> <reason>",
  );
  process.exitCode = 2;
} else {
  try {
    const resolution = await resolveRefundReview({
      providerOrderId,
      decision,
      operator,
      reason,
    });

    if (decision === "confirm") {
      console.info(
        JSON.stringify({ providerOrderId, resolution, reconciliation: null }),
      );
    } else {
      const reconciliation =
        await reconcileDokuPaymentReference(providerOrderId);
      console.info(
        JSON.stringify({ providerOrderId, resolution, reconciliation }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        providerOrderId,
        outcome: "failed",
        category:
          error instanceof Error && "code" in error
            ? String(error.code)
            : "provider_or_processing_error",
      }),
    );
    process.exitCode = 1;
  }
}
