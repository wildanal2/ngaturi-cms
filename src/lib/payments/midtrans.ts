import { createHash } from "node:crypto";
import { env } from "@/lib/env";

const isProd = env.MIDTRANS_IS_PRODUCTION === true;

const SNAP_BASE = isProd
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export const SNAP_JS_URL = isProd
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

export function isPaymentConfigured(): boolean {
  return Boolean(env.MIDTRANS_SERVER_KEY);
}

interface SnapParams {
  orderId: string;
  amount: number;
  customer: { name?: string; email?: string };
  itemName: string;
}

export async function createSnapTransaction(
  p: SnapParams,
): Promise<{ token: string; redirect_url: string }> {
  const auth = Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64");
  const res = await fetch(SNAP_BASE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: { order_id: p.orderId, gross_amount: p.amount },
      item_details: [
        { id: p.orderId, price: p.amount, quantity: 1, name: p.itemName },
      ],
      customer_details: {
        first_name: p.customer.name ?? "Tamu",
        email: p.customer.email,
      },
      callbacks: {
        finish: `${env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans error ${res.status}: ${text}`);
  }
  return res.json();
}

/** signature_key = sha512(order_id + status_code + gross_amount + serverKey) */
export function verifyWebhookSignature(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const expected = createHash("sha512")
    .update(
      body.order_id +
        body.status_code +
        body.gross_amount +
        (env.MIDTRANS_SERVER_KEY ?? ""),
    )
    .digest("hex");
  return expected === body.signature_key;
}
