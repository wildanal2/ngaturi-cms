import { NextResponse } from "next/server";
import { z } from "zod";
import { isDokuStatus, verifyNotification } from "@/lib/payments/doku";
import { getDb } from "@/lib/db";
import {
  applyDokuResult,
  dokuResult,
  PaymentResultError,
} from "@/lib/payments/grant";

const Notification = z
  .object({
    order: z.object({
      invoice_number: z.string().min(1).max(255),
      amount: z.union([z.number(), z.string()]).transform(Number),
      currency: z.string().length(3).optional(),
    }),
    transaction: z.object({ status: z.string().min(1) }),
  })
  .refine(
    (body) => Number.isFinite(body.order.amount) && body.order.amount > 0,
  );

// DOKU server-to-server notification.
// Register this exact URL as the Notification URL in the DOKU dashboard:
//   https://<app>/payment/webhook/doku
export async function POST(req: Request) {
  const db = getDb();
  const raw = await req.text();
  const path = new URL(req.url).pathname; // "/payment/webhook/doku"

  if (!verifyNotification(req.headers, raw, path)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const parsed = Notification.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const { order, transaction } = parsed.data;
  if (!isDokuStatus(transaction.status)) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }
  const requestId = req.headers.get("request-id");

  try {
    const result = await applyDokuResult(
      dokuResult(
        order.invoice_number,
        order.amount,
        transaction.status,
        order.currency,
      ),
      { requestId, source: "webhook" },
      db,
    );
    console.info(
      "DOKU webhook processed",
      JSON.stringify({
        paymentId: result.paymentId,
        providerOrderId: order.invoice_number,
        requestId,
        status: result.status,
        transitioned: result.transitioned,
        fulfilled: result.fulfilled,
      }),
    );
  } catch (error) {
    if (error instanceof PaymentResultError) {
      console.warn(
        "DOKU webhook rejected",
        JSON.stringify({
          providerOrderId: order.invoice_number,
          requestId,
          category: error.code,
        }),
      );
      const status = error.code === "unknown_payment" ? 404 : 422;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error(
      "DOKU webhook processing failed",
      JSON.stringify({
        providerOrderId: order.invoice_number,
        requestId,
        category: "database_or_fulfillment_error",
      }),
    );
    // Non-2xx tells DOKU to retry a transient processing failure.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
