import { z } from "zod";
import { env } from "@/lib/env";
import {
  checkOrderStatus,
  createCheckout,
  DokuCheckoutError,
  isDokuStatus,
  isPaymentConfigured,
  isPaymentSandbox,
  mapStatus,
  verifyNotification,
  verifyNotificationSignature,
  type DokuPaymentResult,
} from "./doku";
import { exactMoney, integerIdr, moneyMinorUnits } from "./money";
import {
  PaymentProviderError,
  WebhookVerificationError,
  type CreatePaymentInput,
  type PaymentIdentity,
  type PaymentObservation,
  type PaymentProvider,
  type VerifiedWebhook,
} from "./provider";

type Configuration = Parameters<typeof createCheckout>[1];

const Money = z.union([z.string(), z.number()]).refine((value) => {
  try {
    moneyMinorUnits(value);
    return true;
  } catch {
    return false;
  }
});
const Notification = z.object({
  order: z.object({
    invoice_number: z.string().min(1).max(255),
    amount: Money.optional(),
    currency: z.string().length(3).optional(),
  }),
  transaction: z.object({ status: z.string().min(1) }),
  refund: z
    .object({
      id: z.string().min(1).max(255).optional(),
      amount: Money.optional(),
    })
    .optional(),
});

export function normalizeDokuResult(
  result: DokuPaymentResult,
): PaymentObservation {
  return {
    provider: "doku",
    merchantReference: result.invoiceNumber,
    status: mapStatus(result.status),
    providerStatus: result.status,
    amount: result.amount === undefined ? undefined : exactMoney(result.amount),
    // Historical DOKU notifications may omit currency; this integration is IDR-only.
    currency: result.currency ?? "IDR",
    refund:
      result.refund === undefined
        ? undefined
        : {
            id: result.refund.id,
            amount:
              result.refund.amount === undefined
                ? undefined
                : exactMoney(result.refund.amount),
          },
  };
}

export class DokuProvider implements PaymentProvider {
  readonly name = "doku";
  readonly label = "DOKU";
  readonly supportsRefundEvidence = true;

  constructor(private readonly configuration?: Configuration) {}

  isConfigured(): boolean {
    return this.configuration
      ? Boolean(this.configuration.clientId && this.configuration.secretKey)
      : isPaymentConfigured();
  }

  isSandbox(): boolean {
    return this.configuration
      ? new URL(this.configuration.baseUrl).hostname === "api-sandbox.doku.com"
      : isPaymentSandbox();
  }

  async createPayment(input: CreatePaymentInput) {
    if (!this.isConfigured())
      throw new PaymentProviderError("payment_not_configured", "unavailable");
    if (input.currency !== "IDR")
      throw new PaymentProviderError("unsupported_currency", "unavailable");
    const callback = new URL(env.DOKU_CALLBACK_URL || input.callbackUrl);
    callback.searchParams.set("invoice", input.merchantReference);
    try {
      const created = await createCheckout(
        {
          orderId: input.merchantReference,
          amount: integerIdr(input.amount),
          itemName: input.itemName,
          customer: input.customer,
          callbackUrl: callback.toString(),
        },
        this.configuration,
      );
      return {
        redirectUrl: created.url,
        providerPaymentId: created.sessionId || created.tokenId || null,
      };
    } catch (error) {
      if (error instanceof DokuCheckoutError) {
        throw new PaymentProviderError("doku_checkout_error", error.outcome);
      }
      throw error;
    }
  }

  async getPaymentStatus(
    payment: PaymentIdentity,
  ): Promise<PaymentObservation> {
    if (!this.isConfigured())
      throw new PaymentProviderError("payment_not_configured", "unavailable");
    return normalizeDokuResult(
      await checkOrderStatus(payment.providerOrderId, this.configuration),
    );
  }

  parseVerifiedWebhook(
    headers: Headers,
    rawBody: string,
    requestPath: string,
  ): VerifiedWebhook {
    const verified = this.configuration
      ? verifyNotificationSignature(
          headers,
          rawBody,
          requestPath,
          this.configuration.clientId,
          this.configuration.secretKey,
        )
      : verifyNotification(headers, rawBody, requestPath);
    if (!verified) throw new WebhookVerificationError("bad_signature");
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("bad_body");
    }
    const parsed = Notification.safeParse(json);
    if (!parsed.success) throw new WebhookVerificationError("bad_body");
    const { order, transaction, refund } = parsed.data;
    if (!isDokuStatus(transaction.status))
      throw new WebhookVerificationError("bad_status");
    if (transaction.status !== "REFUNDED" && order.amount === undefined) {
      throw new WebhookVerificationError("bad_body");
    }
    return {
      requestId: headers.get("request-id"),
      observation: normalizeDokuResult({
        invoiceNumber: order.invoice_number,
        amount: order.amount,
        currency: order.currency,
        status: transaction.status,
        refund,
      }),
    };
  }
}
