export type PaymentProviderName = "doku" | "sumopod";
export type PaymentResultStatus =
  "pending" | "paid" | "failed" | "expired" | "refunded";

export interface PaymentIdentity {
  providerOrderId: string;
  providerPaymentId: string | null;
}

/** Only adapters may construct observations from authenticated provider data. */
export interface PaymentObservation {
  provider: PaymentProviderName;
  merchantReference: string;
  providerPaymentId?: string;
  status: PaymentResultStatus;
  providerStatus: string;
  // Exact decimal strings, in the same units as payments.amount (IDR).
  amount?: string;
  currency: string;
  refund?: { id?: string; amount?: string };
}

export interface CreatePaymentInput {
  merchantReference: string;
  amount: string;
  currency: "IDR";
  itemName: string;
  customer: { name?: string | null; email?: string | null };
  callbackUrl: string;
}

export interface CreatedPayment {
  redirectUrl: string;
  providerPaymentId: string | null;
}

export interface VerifiedWebhook {
  observation: PaymentObservation | null;
  requestId: string | null;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly label: string;
  readonly supportsRefundEvidence: boolean;
  isConfigured(): boolean;
  isSandbox(): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  getPaymentStatus(payment: PaymentIdentity): Promise<PaymentObservation>;
  parseVerifiedWebhook(
    headers: Headers,
    rawBody: string,
    requestPath: string,
  ): VerifiedWebhook;
}

export class PaymentProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly outcome: "unavailable" | "rejected" | "unknown" = "unknown",
  ) {
    super(code);
    this.name = "PaymentProviderError";
  }
}

export class WebhookVerificationError extends Error {
  constructor(
    public readonly code: "bad_signature" | "bad_body" | "bad_status",
  ) {
    super(code);
    this.name = "WebhookVerificationError";
  }
}
