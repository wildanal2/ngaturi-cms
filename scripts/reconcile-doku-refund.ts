import { reconcileDokuRefund } from "../src/lib/payments/refund-reconcile";

const invoiceNumber = process.argv[2]?.trim();

if (!invoiceNumber || invoiceNumber.length > 255) {
  console.error(
    "Usage: npm run payments:reconcile-refund -- <provider_order_id>",
  );
  process.exitCode = 2;
} else {
  try {
    const result = await reconcileDokuRefund(invoiceNumber);
    if (result.outcome === "not_refunded") {
      console.info(
        JSON.stringify({
          invoiceNumber,
          outcome: result.outcome,
          providerStatus: result.providerStatus,
        }),
      );
    } else {
      console.info(
        JSON.stringify({
          invoiceNumber,
          outcome: result.outcome,
          paymentId: result.payment.paymentId,
          status: result.payment.status,
          transitioned: result.payment.transitioned,
          reviewRequired: result.payment.reviewRequired,
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        invoiceNumber,
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
