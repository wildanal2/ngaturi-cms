import { getDb } from "@/lib/db";
import { applyPaymentObservation, PaymentResultError } from "./grant";
import { WebhookVerificationError, type PaymentProviderName } from "./provider";
import { resolvePaymentProvider } from "./registry";

/** Provider is fixed by the endpoint; PAYMENT_PROVIDER never selects a webhook parser. */
export async function processProviderWebhook(
  req: Request,
  providerName: PaymentProviderName,
): Promise<Response> {
  let verified;
  try {
    verified = resolvePaymentProvider(providerName).parseVerifiedWebhook(
      req.headers,
      await req.text(),
      new URL(req.url).pathname,
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "bad_signature" ? 401 : 400 },
      );
    }
    return Response.json(
      { error: "verification_unavailable" },
      { status: 503 },
    );
  }
  if (!verified.observation) return Response.json({ ok: true });
  try {
    const result = await applyPaymentObservation(
      verified.observation,
      {
        source: "webhook",
        requestId: verified.requestId,
      },
      getDb(),
    );
    console.info(
      "Payment webhook processed",
      JSON.stringify({
        provider: providerName,
        paymentId: result.paymentId,
        status: result.status,
        transitioned: result.transitioned,
        fulfilled: result.fulfilled,
        reviewRequired: result.reviewRequired,
      }),
    );
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PaymentResultError) {
      console.warn(
        "Payment webhook rejected",
        JSON.stringify({ provider: providerName, category: error.code }),
      );
      return Response.json(
        { error: error.code },
        { status: error.code === "unknown_payment" ? 404 : 422 },
      );
    }
    console.error(
      "Payment webhook processing failed",
      JSON.stringify({
        provider: providerName,
        category: "database_or_fulfillment_error",
      }),
    );
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }
}
