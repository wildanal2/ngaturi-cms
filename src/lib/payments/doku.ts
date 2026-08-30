import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";

const isProd = env.DOKU_IS_PRODUCTION === true;
const BASE = isProd ? "https://api.doku.com" : "https://api-sandbox.doku.com";
const CHECKOUT_TARGET = "/checkout/v1/payment";
const NOTIFY_TARGET = "/checkout/v1/notify";

export function isPaymentConfigured(): boolean {
  return Boolean(env.DOKU_CLIENT_ID && env.DOKU_SECRET_KEY);
}

function digest(body: string): string {
  return createHash("sha256").update(body).digest("base64");
}

/** DOKU signature: HMACSHA256 over the canonical component string, base64. */
function sign(params: {
  clientId: string;
  requestId: string;
  timestamp: string;
  target: string;
  bodyDigest: string;
}): string {
  const raw =
    `Client-Id:${params.clientId}\n` +
    `Request-Id:${params.requestId}\n` +
    `Request-Timestamp:${params.timestamp}\n` +
    `Request-Target:${params.target}\n` +
    `Digest:${params.bodyDigest}`;
  const mac = createHmac("sha256", env.DOKU_SECRET_KEY ?? "")
    .update(raw)
    .digest("base64");
  return `HMACSHA256=${mac}`;
}

interface CheckoutParams {
  orderId: string;
  amount: number; // IDR, integer
  itemName: string;
  customer: { name?: string | null; email?: string | null };
  callbackUrl: string;
}

/** Creates a DOKU hosted-checkout session, returns the payment page URL. */
export async function createCheckout(
  p: CheckoutParams,
): Promise<{ url: string; tokenId: string }> {
  const clientId = env.DOKU_CLIENT_ID ?? "";
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const due = 60; // minutes

  const body = JSON.stringify({
    order: {
      amount: Math.round(p.amount),
      invoice_number: p.orderId,
      currency: "IDR",
      callback_url: p.callbackUrl,
      line_items: [
        { name: p.itemName, price: Math.round(p.amount), quantity: 1 },
      ],
    },
    payment: { payment_due_date: due },
    customer: {
      name: p.customer.name ?? "Pengguna Ngaturi",
      email: p.customer.email ?? undefined,
    },
  });

  const res = await fetch(BASE + CHECKOUT_TARGET, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: sign({
        clientId,
        requestId,
        timestamp,
        target: CHECKOUT_TARGET,
        bodyDigest: digest(body),
      }),
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `DOKU ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`,
    );
  }
  const url: string | undefined = data?.response?.payment?.url;
  const tokenId: string | undefined = data?.response?.payment?.token_id;
  if (!url) throw new Error("DOKU: URL pembayaran tidak diterima");
  return { url, tokenId: tokenId ?? "" };
}

/**
 * Verify a DOKU HTTP notification. DOKU signs the raw request body the same
 * way; recompute and compare against the `Signature` header.
 */
export function verifyNotification(
  headers: Headers,
  rawBody: string,
): boolean {
  const clientId = headers.get("client-id");
  const requestId = headers.get("request-id");
  const timestamp = headers.get("request-timestamp");
  const signature = headers.get("signature");
  if (!clientId || !requestId || !timestamp || !signature) return false;
  if (clientId !== env.DOKU_CLIENT_ID) return false;

  const expected = sign({
    clientId,
    requestId,
    timestamp,
    target: NOTIFY_TARGET,
    bodyDigest: digest(rawBody),
  });
  return expected === signature;
}
