import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const CHECKOUT_TARGET = "/checkout/v1/payment";
export const DOKU_CHECKOUT_DUE_MINUTES = 60;

interface DokuConfiguration {
  baseUrl: string;
  clientId: string;
  secretKey: string;
}

export function isPaymentConfigured(): boolean {
  return Boolean(env.DOKU_CLIENT_ID && env.DOKU_SECRET_KEY);
}

function paymentConfiguration(): DokuConfiguration {
  const clientId = env.DOKU_CLIENT_ID;
  const secretKey = env.DOKU_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error("DOKU payment configuration is incomplete");
  }
  return {
    baseUrl: env.DOKU_BASE_URL.replace(/\/$/, ""),
    clientId,
    secretKey,
  };
}

/** ISO8601 UTC, no ms: 2020-08-11T08:45:42Z */
function makeTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function b64Sha256(s: string): string {
  return createHash("sha256").update(s).digest("base64");
}

function safeSignatureEqual(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

/**
 * DOKU Jokul signature.
 * component = "Client-Id:..\nRequest-Id:..\nRequest-Timestamp:..\nRequest-Target:<path>[\nDigest:<b64(sha256(body))>]"
 * header    = "HMACSHA256=" + base64(hmac-sha256(component, secretKey))
 */
function buildSignature(params: {
  clientId: string;
  secretKey: string;
  requestId: string;
  timestamp: string;
  target: string;
  jsonBody?: string;
}): string {
  const parts = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.timestamp}`,
    `Request-Target:${params.target}`,
  ];
  if (params.jsonBody && params.jsonBody !== "") {
    parts.push(`Digest:${b64Sha256(params.jsonBody)}`);
  }
  const mac = createHmac("sha256", params.secretKey)
    .update(parts.join("\n"))
    .digest("base64");
  return `HMACSHA256=${mac}`;
}

function verifyResponseSignature(params: {
  headers: Headers;
  rawBody: string;
  clientId: string;
  secretKey: string;
  requestId: string;
  target: string;
  includeDigest: boolean;
}): boolean {
  const responseClientId = params.headers.get("client-id");
  const responseRequestId = params.headers.get("request-id");
  const timestamp = params.headers.get("response-timestamp");
  const received = params.headers.get("signature");
  if (
    responseClientId !== params.clientId ||
    responseRequestId !== params.requestId ||
    !timestamp ||
    Number.isNaN(Date.parse(timestamp)) ||
    !received
  ) {
    return false;
  }
  const parts = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Response-Timestamp:${timestamp}`,
    `Request-Target:${params.target}`,
  ];
  if (params.includeDigest) {
    parts.push(`Digest:${b64Sha256(params.rawBody)}`);
  }
  const expected = `HMACSHA256=${createHmac("sha256", params.secretKey)
    .update(parts.join("\n"))
    .digest("base64")}`;
  return safeSignatureEqual(expected, received);
}

/** DOKU only allows: a-z A-Z 0-9 . - / + , = _ : ' @ % and space. */
export function sanitizeText(text: string, fallback = "Pembayaran"): string {
  const swapped = (text ?? "")
    .replace(/[—–]/g, "-")
    .replace(/#/g, "No.")
    .replace(/&/g, "dan");
  const clean = swapped.replace(/[^a-zA-Z0-9 .\-/+,=_:'@%]/g, "").trim();
  return clean || fallback;
}

interface CheckoutParams {
  orderId: string;
  amount: number;
  itemName: string;
  customer: { name?: string | null; email?: string | null };
  callbackUrl: string;
}

export async function createCheckout(
  p: CheckoutParams,
  configuration = paymentConfiguration(),
): Promise<{ url: string; tokenId: string; sessionId: string | null }> {
  const requestId = crypto.randomUUID();
  const timestamp = makeTimestamp();

  const jsonBody = JSON.stringify({
    order: {
      amount: Math.round(p.amount),
      invoice_number: p.orderId,
      currency: "IDR",
      callback_url: p.callbackUrl,
      auto_redirect: true,
      line_items: [
        {
          name: sanitizeText(p.itemName),
          quantity: 1,
          price: Math.round(p.amount),
        },
      ],
    },
    payment: { payment_due_date: DOKU_CHECKOUT_DUE_MINUTES },
    customer: {
      name: sanitizeText(p.customer.name ?? "Pengguna Ngaturi", "Pengguna"),
      email: p.customer.email ?? undefined,
    },
  });

  const res = await fetch(configuration.baseUrl + CHECKOUT_TARGET, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": configuration.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: buildSignature({
        clientId: configuration.clientId,
        secretKey: configuration.secretKey,
        requestId,
        timestamp,
        target: CHECKOUT_TARGET,
        jsonBody,
      }),
    },
    body: jsonBody,
  });

  const rawResponse = await res.text();
  if (
    !verifyResponseSignature({
      headers: res.headers,
      rawBody: rawResponse,
      clientId: configuration.clientId,
      secretKey: configuration.secretKey,
      requestId,
      target: CHECKOUT_TARGET,
      includeDigest: true,
    })
  ) {
    throw new Error("DOKU checkout response signature is invalid");
  }
  const data = JSON.parse(rawResponse);
  if (!res.ok) {
    throw new Error(`DOKU checkout request failed (${res.status})`);
  }
  const payload = data?.response ?? data;
  if (
    payload?.order?.invoice_number !== p.orderId ||
    Number(payload?.order?.amount) !== Math.round(p.amount) ||
    payload?.order?.currency !== "IDR"
  ) {
    throw new Error("DOKU checkout response did not match the payment request");
  }
  const url: string | undefined = payload?.payment?.url;
  if (!url) throw new Error("DOKU: URL pembayaran tidak diterima");
  const checkoutUrl = new URL(url);
  if (
    checkoutUrl.protocol !== "https:" ||
    (checkoutUrl.hostname !== "doku.com" &&
      !checkoutUrl.hostname.endsWith(".doku.com"))
  ) {
    throw new Error("DOKU returned an invalid checkout URL");
  }
  return {
    url: checkoutUrl.toString(),
    tokenId: payload?.payment?.token_id ?? "",
    sessionId: payload?.order?.session_id ?? null,
  };
}

export const DOKU_STATUSES = [
  "SUCCESS",
  "PENDING",
  "FAILED",
  "EXPIRED",
  "REVERSED",
  "CANCELLED",
  "TIMEOUT",
  "REDIRECT",
  "REFUNDED",
] as const;
export type DokuStatus = (typeof DOKU_STATUSES)[number];

export function isDokuStatus(value: unknown): value is DokuStatus {
  return (
    typeof value === "string" && DOKU_STATUSES.includes(value as DokuStatus)
  );
}

export interface DokuPaymentResult {
  invoiceNumber: string;
  amount: number;
  currency?: string;
  status: DokuStatus;
}

/** Query order status (used by the return/callback page). */
export async function checkOrderStatus(
  gatewayOrderId: string,
  configuration = paymentConfiguration(),
): Promise<DokuPaymentResult> {
  const target = `/orders/v1/status/${gatewayOrderId}`;
  const requestId = crypto.randomUUID();
  const timestamp = makeTimestamp();

  const res = await fetch(
    `${configuration.baseUrl}${target}?client_id=${encodeURIComponent(configuration.clientId)}`,
    {
      headers: {
        "Client-Id": configuration.clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: buildSignature({
          clientId: configuration.clientId,
          secretKey: configuration.secretKey,
          requestId,
          timestamp,
          target,
        }),
      },
    },
  );
  const rawResponse = await res.text();
  if (
    !verifyResponseSignature({
      headers: res.headers,
      rawBody: rawResponse,
      clientId: configuration.clientId,
      secretKey: configuration.secretKey,
      requestId,
      target,
      includeDigest: false,
    })
  ) {
    throw new Error("DOKU status response signature is invalid");
  }
  const data = JSON.parse(rawResponse);
  if (!res.ok) {
    throw new Error(`DOKU status request failed (${res.status})`);
  }

  const invoiceNumber = data?.order?.invoice_number;
  const amount = Number(data?.order?.amount);
  const status = data?.transaction?.status;
  const currency = data?.order?.currency;
  if (
    invoiceNumber !== gatewayOrderId ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isDokuStatus(status) ||
    (currency !== undefined && currency !== "IDR")
  ) {
    throw new Error("DOKU returned an invalid status response");
  }

  return { invoiceNumber, amount, currency, status };
}

/**
 * Verify a DOKU notification. `requestPath` MUST be the exact path DOKU
 * called (i.e. what's registered as the Notification URL) — pass the
 * incoming request's pathname.
 */
export function verifyNotification(
  headers: Headers,
  rawBody: string,
  requestPath: string,
): boolean {
  const clientId = env.DOKU_CLIENT_ID;
  const secretKey = env.DOKU_SECRET_KEY;
  if (!clientId || !secretKey) return false;
  return verifyNotificationSignature(
    headers,
    rawBody,
    requestPath,
    clientId,
    secretKey,
  );
}

export function verifyNotificationSignature(
  headers: Headers,
  rawBody: string,
  requestPath: string,
  expectedClientId: string,
  secretKey: string,
): boolean {
  const clientId = headers.get("client-id");
  const requestId = headers.get("request-id");
  const timestamp = headers.get("request-timestamp");
  const received = headers.get("signature");
  if (!clientId || !requestId || !timestamp || !received) return false;
  if (clientId !== expectedClientId) return false;
  if (requestId.length > 128 || Number.isNaN(Date.parse(timestamp)))
    return false;

  const expected =
    `HMACSHA256=` +
    createHmac("sha256", secretKey)
      .update(
        [
          `Client-Id:${clientId}`,
          `Request-Id:${requestId}`,
          `Request-Timestamp:${timestamp}`,
          `Request-Target:${requestPath}`,
          `Digest:${b64Sha256(rawBody)}`,
        ].join("\n"),
      )
      .digest("base64");
  return safeSignatureEqual(expected, received);
}

/** DOKU transaction.status → our payments.status */
export function mapStatus(
  s: DokuStatus,
): "paid" | "expired" | "failed" | "pending" {
  switch (s) {
    case "SUCCESS":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      // DOKU Checkout lets a customer retry another payment method after a
      // channel failure, so FAILED is not final for the checkout order.
      return "pending";
    case "REVERSED":
    case "CANCELLED":
      return "failed";
    default:
      return "pending";
  }
}
