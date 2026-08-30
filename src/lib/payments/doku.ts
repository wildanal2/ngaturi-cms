import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";

const BASE = (env.DOKU_BASE_URL || "https://api-sandbox.doku.com").replace(
  /\/$/,
  "",
);
const CHECKOUT_TARGET = "/checkout/v1/payment";

export function isPaymentConfigured(): boolean {
  return Boolean(env.DOKU_CLIENT_ID && env.DOKU_SECRET_KEY);
}

/** ISO8601 UTC, no ms: 2020-08-11T08:45:42Z */
function makeTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function b64Sha256(s: string): string {
  return createHash("sha256").update(s).digest("base64");
}

/**
 * DOKU Jokul signature.
 * component = "Client-Id:..\nRequest-Id:..\nRequest-Timestamp:..\nRequest-Target:<path>[\nDigest:<b64(sha256(body))>]"
 * header    = "HMACSHA256=" + base64(hmac-sha256(component, secretKey))
 */
function buildSignature(params: {
  requestId: string;
  timestamp: string;
  target: string;
  jsonBody?: string;
}): string {
  const parts = [
    `Client-Id:${env.DOKU_CLIENT_ID ?? ""}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.timestamp}`,
    `Request-Target:${params.target}`,
  ];
  if (params.jsonBody && params.jsonBody !== "") {
    parts.push(`Digest:${b64Sha256(params.jsonBody)}`);
  }
  const mac = createHmac("sha256", env.DOKU_SECRET_KEY ?? "")
    .update(parts.join("\n"))
    .digest("base64");
  return `HMACSHA256=${mac}`;
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
    payment: { payment_due_date: 60 },
    customer: {
      name: sanitizeText(p.customer.name ?? "Pengguna Ngaturi", "Pengguna"),
      email: p.customer.email ?? undefined,
    },
  });

  const res = await fetch(BASE + CHECKOUT_TARGET, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": env.DOKU_CLIENT_ID ?? "",
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: buildSignature({
        requestId,
        timestamp,
        target: CHECKOUT_TARGET,
        jsonBody,
      }),
    },
    body: jsonBody,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `DOKU ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`,
    );
  }
  const payload = data?.response ?? data;
  const url: string | undefined = payload?.payment?.url;
  if (!url) throw new Error("DOKU: URL pembayaran tidak diterima");
  return {
    url,
    tokenId: payload?.payment?.token_id ?? "",
    sessionId: payload?.order?.session_id ?? null,
  };
}

export type DokuStatus = "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED" | string;

/** Query order status (used by the return/callback page). */
export async function checkOrderStatus(
  gatewayOrderId: string,
): Promise<DokuStatus> {
  const target = `/orders/v1/status/${gatewayOrderId}`;
  const requestId = crypto.randomUUID();
  const timestamp = makeTimestamp();

  const res = await fetch(
    `${BASE}${target}?client_id=${encodeURIComponent(env.DOKU_CLIENT_ID ?? "")}`,
    {
      headers: {
        "Client-Id": env.DOKU_CLIENT_ID ?? "",
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: buildSignature({ requestId, timestamp, target }),
      },
    },
  );
  const data = await res.json().catch(() => ({}));
  return (data?.transaction?.status ?? "PENDING") as DokuStatus;
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
  const clientId = headers.get("client-id");
  const requestId = headers.get("request-id");
  const timestamp = headers.get("request-timestamp");
  const received = headers.get("signature");
  if (!clientId || !requestId || !timestamp || !received) return false;
  if (env.DOKU_CLIENT_ID && clientId !== env.DOKU_CLIENT_ID) return false;

  const expected =
    `HMACSHA256=` +
    createHmac("sha256", env.DOKU_SECRET_KEY ?? "")
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
  return expected === received;
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
    case "REVERSED":
    case "CANCELLED":
      return "failed";
    default:
      return "pending";
  }
}
