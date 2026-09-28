import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { isPaymentConfigured } from "@/lib/payments/doku";
import { reconcilePendingDokuPayments } from "@/lib/payments/reconcile";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPaymentConfigured()) {
    return NextResponse.json(
      { error: "payment_not_configured" },
      { status: 503 },
    );
  }

  try {
    const summary = await reconcilePendingDokuPayments({ database: getDb() });
    console.info("DOKU reconciliation completed", JSON.stringify(summary));
    return NextResponse.json(summary, {
      status: summary.errors > 0 ? 502 : 200,
    });
  } catch {
    console.error(
      "DOKU reconciliation failed",
      JSON.stringify({ category: "batch_processing_error" }),
    );
    return NextResponse.json(
      { error: "reconciliation_failed" },
      { status: 500 },
    );
  }
}
