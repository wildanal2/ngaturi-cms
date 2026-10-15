import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { exactMoney, integerIdr, moneyMatches } from "./money";
import { providerRequest } from "./http";
import {
  PaymentProviderError,
  WebhookVerificationError,
  type CreatePaymentInput,
  type PaymentIdentity,
  type PaymentObservation,
  type PaymentProvider,
  type PaymentResultStatus,
  type VerifiedWebhook,
} from "./provider";

export const SUMOPOD_SANDBOX_BASE_URL = "https://api-pay-sandbox.sumopod.com";
export const SUMOPOD_LIVE_BASE_URL = "https://api-pay.sumopod.com";
// Returned by the official sandbox create API during acceptance; differs from Quick Start's example.
export const SUMOPOD_SANDBOX_CHECKOUT_HOST = "sumo.sandbox.pymnt.global";
export const SUMOPOD_LIVE_CHECKOUT_HOST = "checkout.pymnt.app";
const SIGNATURE_TOLERANCE_SECONDS = 300;

export interface SumopodConfiguration {
  baseUrl: string;
  liveEnabled?: boolean;
  apiKey?: string;
  webhookSecret?: string;
  webhookToken?: string;
}

function configuration(): SumopodConfiguration {
  return {
    baseUrl: env.SUMOPOD_BASE_URL ?? SUMOPOD_SANDBOX_BASE_URL,
    liveEnabled: env.SUMOPOD_LIVE_ENABLED === "true",
    apiKey: env.SUMOPOD_API_KEY,
    webhookSecret: env.SUMOPOD_WEBHOOK_SECRET,
    webhookToken: env.SUMOPOD_WEBHOOK_TOKEN,
  };
}

const Amount = z.union([z.string(), z.number()]).transform((value, ctx) => {
  try {
    return exactMoney(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "Invalid exact amount" });
    return z.NEVER;
  }
});
const Status = z.enum([
  "pending",
  "completed",
  "failed",
  "expired",
  "cancelled",
]);
const PaymentData = z.object({
  payment_id: z.uuid(),
  order_id: z.string().min(1).max(255),
  amount: Amount,
  currency: z.string().length(3).optional(),
  status: Status,
});
const CreateResponse = PaymentData.extend({ payment_link_url: z.url() });

export function mapSumopodStatus(
  status: z.infer<typeof Status>,
): PaymentResultStatus {
  switch (status) {
    case "completed":
      return "paid";
    case "expired":
      return "expired";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      return "pending";
  }
}

/** Normalization of the official payment/webhook data shape, not a guessed status endpoint. */
export function normalizeSumopodPayment(data: unknown): PaymentObservation {
  const parsed = PaymentData.safeParse(data);
  if (!parsed.success)
    throw new PaymentProviderError("invalid_provider_response");
  return {
    provider: "sumopod",
    merchantReference: parsed.data.order_id,
    providerPaymentId: parsed.data.payment_id,
    amount: parsed.data.amount,
    currency: parsed.data.currency ?? "IDR",
    status: mapSumopodStatus(parsed.data.status),
    providerStatus: parsed.data.status,
  };
}

export function parseSumopodCreatedPayment(
  input: Pick<CreatePaymentInput, "merchantReference" | "amount" | "currency">,
  data: unknown,
  baseUrl = SUMOPOD_SANDBOX_BASE_URL,
) {
  const parsed = CreateResponse.safeParse(data);
  if (!parsed.success)
    throw new PaymentProviderError("invalid_provider_response");
  if (
    parsed.data.order_id !== input.merchantReference ||
    !moneyMatches(parsed.data.amount, input.amount) ||
    (parsed.data.currency !== undefined &&
      parsed.data.currency !== input.currency)
  ) {
    throw new PaymentProviderError("provider_response_mismatch");
  }
  const url = new URL(parsed.data.payment_link_url);
  const paymentLinksId = /^\/payment-links\/([^/]+)$/.exec(url.pathname)?.[1];
  const validPaymentLinksPath = z.uuid().safeParse(paymentLinksId).success;
  const documentedLink =
    url.hostname === "pay.sumopod.com" &&
    url.pathname === `/pay/${parsed.data.payment_id}`;
  // Validate the LIVE link UUID without assuming it equals payment_id.
  const observedLiveLink =
    baseUrl === SUMOPOD_LIVE_BASE_URL &&
    url.hostname === SUMOPOD_LIVE_CHECKOUT_HOST &&
    validPaymentLinksPath;
  // The payment-link UUID is distinct from payment_id in the observed sandbox response.
  const observedSandboxLink =
    baseUrl === SUMOPOD_SANDBOX_BASE_URL &&
    url.hostname === SUMOPOD_SANDBOX_CHECKOUT_HOST &&
    /^\/payment-links\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      url.pathname,
    );
  // Reject normalization tricks, empty query/fragment markers, and empty userinfo.
  const literalUrl =
    parsed.data.payment_link_url === `https://${url.hostname}${url.pathname}` ||
    parsed.data.payment_link_url ===
      `https://${url.hostname}:443${url.pathname}`;
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !literalUrl ||
    (!documentedLink && !observedLiveLink && !observedSandboxLink)
  ) {
    throw new PaymentProviderError("untrusted_checkout_url", "unknown", {
      checkoutHostname:
        url.hostname === "pay.sumopod.com" ||
        url.hostname === SUMOPOD_LIVE_CHECKOUT_HOST ||
        url.hostname === SUMOPOD_SANDBOX_CHECKOUT_HOST
          ? url.hostname
          : "unrecognized",
      checkoutPathType: validPaymentLinksPath
        ? "payment_links_uuid"
        : z.uuid().safeParse(/^\/pay\/([^/]+)$/.exec(url.pathname)?.[1]).success
          ? "pay_uuid"
          : "other",
    });
  }
  return {
    redirectUrl: url.toString(),
    providerPaymentId: parsed.data.payment_id,
  };
}

function constantTimeEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validSigningSecret(secret: string | undefined): boolean {
  return Boolean(
    secret &&
    /^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret) &&
    Buffer.from(secret.slice(6), "base64").length > 0,
  );
}

/** Official Sumopod Svix protocol; when configured, signatures cannot downgrade to token auth. */
export function verifySumopodWebhook(
  headers: Headers,
  rawBody: string,
  config: SumopodConfiguration,
  now = Date.now(),
): boolean {
  if (config.webhookSecret) {
    if (!validSigningSecret(config.webhookSecret)) return false;
    const id = headers.get("svix-id");
    const timestamp = headers.get("svix-timestamp");
    const signatures = headers.get("svix-signature");
    if (
      !id ||
      id.length > 255 ||
      !timestamp ||
      !/^\d{1,12}$/.test(timestamp) ||
      !signatures ||
      signatures.length > 4096
    )
      return false;
    if (Math.abs(now / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS)
      return false;
    const expected = createHmac(
      "sha256",
      Buffer.from(config.webhookSecret.slice(6), "base64"),
    )
      .update(`${id}.${timestamp}.${rawBody}`)
      .digest("base64");
    return signatures.split(" ").some((part) => {
      const [version, signature] = part.split(",");
      return (
        version === "v1" &&
        Boolean(signature) &&
        constantTimeEqual(expected, signature)
      );
    });
  }
  const token = headers.get("x-webhook-token");
  return Boolean(
    config.webhookToken &&
    token &&
    constantTimeEqual(config.webhookToken, token),
  );
}

export class SumopodProvider implements PaymentProvider {
  readonly name = "sumopod";
  readonly label = "Sumopod";
  readonly supportsRefundEvidence = false;
  constructor(private readonly suppliedConfiguration?: SumopodConfiguration) {}

  private config() {
    return this.suppliedConfiguration ?? configuration();
  }

  isSandbox(): boolean {
    return this.config().baseUrl === SUMOPOD_SANDBOX_BASE_URL;
  }

  isConfigured(): boolean {
    const config = this.config();
    // Live requires two explicit settings. Missing/invalid flags never enable it.
    // No status-query API exists: accepted live settlement remains webhook-driven.
    return (
      (config.baseUrl === SUMOPOD_SANDBOX_BASE_URL ||
        (config.baseUrl === SUMOPOD_LIVE_BASE_URL &&
          config.liveEnabled === true)) &&
      Boolean(config.apiKey?.trim()) &&
      (config.webhookSecret
        ? validSigningSecret(config.webhookSecret)
        : Boolean(config.webhookToken?.trim()))
    );
  }

  async createPayment(input: CreatePaymentInput) {
    if (!this.isConfigured())
      throw new PaymentProviderError("payment_not_configured", "unavailable");
    if (input.currency !== "IDR")
      throw new PaymentProviderError("unsupported_currency", "unavailable");
    const config = this.config();
    // The durable reference supports webhook/manual review; never retry this POST.
    const { response, rawBody } = await providerRequest(
      `${config.baseUrl}/api/v1/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": config.apiKey!,
        },
        body: JSON.stringify({
          order_id: input.merchantReference,
          amount: integerIdr(input.amount),
          currency: "IDR",
          expires_in_hours: 24,
          success_return_url: input.callbackUrl,
          cancel_return_url: input.callbackUrl,
          payment_method_type_code: "QRIS",
        }),
      },
    );
    // Rejection/idempotency guarantees are not documented: every API failure stays recoverable.
    if (!response.ok)
      throw new PaymentProviderError(
        "sumopod_create_outcome_unknown",
        "unknown",
        {
          upstreamStatus: response.status,
        },
      );
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new PaymentProviderError("invalid_provider_response", "unknown", {
        upstreamStatus: response.status,
      });
    }
    try {
      return parseSumopodCreatedPayment(input, json, config.baseUrl);
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw new PaymentProviderError(error.code, error.outcome, {
          ...error.diagnostics,
          upstreamStatus: response.status,
        });
      }
      throw error;
    }
  }

  async getPaymentStatus(
    _payment: PaymentIdentity,
  ): Promise<PaymentObservation> {
    void _payment;
    // Do not invent a URL, authentication scope, lookup rule, or status response shape.
    throw new PaymentProviderError(
      "sumopod_status_contract_missing",
      "unavailable",
    );
  }

  parseVerifiedWebhook(
    headers: Headers,
    rawBody: string,
    _requestPath: string,
  ): VerifiedWebhook {
    void _requestPath;
    if (!verifySumopodWebhook(headers, rawBody, this.config()))
      throw new WebhookVerificationError("bad_signature");
    let body: { event_type?: unknown; data?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("bad_body");
    }
    if (!body || typeof body !== "object")
      throw new WebhookVerificationError("bad_body");
    const requestId = headers.get("svix-id");
    if (body.event_type === "payment.test")
      return { observation: null, requestId };
    const expectedStatus: Record<string, string> = {
      "payment.completed": "completed",
      "payment.failed": "failed",
      "payment.expired": "expired",
    };
    if (
      typeof body.event_type !== "string" ||
      !Object.hasOwn(expectedStatus, body.event_type)
    ) {
      throw new WebhookVerificationError("bad_status");
    }
    const parsed = PaymentData.safeParse(body.data);
    if (!parsed.success) throw new WebhookVerificationError("bad_body");
    if (parsed.data.status !== expectedStatus[body.event_type])
      throw new WebhookVerificationError("bad_status");
    return { requestId, observation: normalizeSumopodPayment(parsed.data) };
  }
}
