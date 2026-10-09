import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { reconcilePayments } from "@/lib/payments/reconcile";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await reconcilePayments({ database: getDb() });
    console.info("Payment reconciliation completed", JSON.stringify(summary));
    return NextResponse.json(summary, {
      status: summary.errors > 0 ? 502 : 200,
    });
  } catch {
    console.error(
      "Payment reconciliation failed",
      JSON.stringify({ category: "batch_processing_error" }),
    );
    return NextResponse.json(
      { error: "reconciliation_failed" },
      { status: 500 },
    );
  }
}
