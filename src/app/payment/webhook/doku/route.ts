import { NextResponse } from "next/server";
import { verifyNotification } from "@/lib/payments/doku";
import { applyDokuResult } from "@/lib/payments/grant";

// DOKU server-to-server notification.
// Register this exact URL as the Notification URL in the DOKU dashboard:
//   https://<app>/payment/webhook/doku
export async function POST(req: Request) {
  const raw = await req.text();
  const path = new URL(req.url).pathname; // "/payment/webhook/doku"

  if (!verifyNotification(req.headers, raw, path)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: {
    order?: { invoice_number?: string };
    transaction?: { status?: string };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const invoice = body.order?.invoice_number;
  const status = body.transaction?.status ?? "PENDING";
  if (!invoice) {
    return NextResponse.json({ error: "no invoice" }, { status: 400 });
  }

  try {
    await applyDokuResult(invoice, status, body);
  } catch {
    // 200 so DOKU doesn't hammer retries; failure is logged app-side
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}
