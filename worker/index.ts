import handler from "vinext/server/fetch-handler";
import { isPaymentConfigured } from "../src/lib/payments/doku";
import { reconcilePendingDokuPayments } from "../src/lib/payments/reconcile";
import { getDb } from "../src/lib/db";
import {
  assertWorkerRuntimeContract,
  runWithInvocationContext,
  type NgaturiWorkerEnv,
} from "../src/lib/runtime/context";

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

async function reconcileScheduledPayments(): Promise<void> {
  if (!isPaymentConfigured()) {
    console.warn(
      "DOKU scheduled reconciliation skipped",
      JSON.stringify({ category: "payment_not_configured" }),
    );
    return;
  }

  const summary = await reconcilePendingDokuPayments({ database: getDb() });
  console.info(
    "DOKU scheduled reconciliation completed",
    JSON.stringify(summary),
  );
  if (summary.errors > 0) {
    throw new Error("DOKU scheduled reconciliation completed with errors");
  }
}

const worker = {
  fetch(
    request: Request,
    env: NgaturiWorkerEnv,
    ctx: WorkerExecutionContext,
  ): Promise<Response> {
    assertWorkerRuntimeContract(env);
    return runWithInvocationContext(env, () =>
      handler.fetch(request, env, ctx),
    );
  },

  scheduled(
    _controller: ScheduledController,
    env: NgaturiWorkerEnv,
    ctx: WorkerExecutionContext,
  ): void {
    assertWorkerRuntimeContract(env);
    ctx.waitUntil(
      runWithInvocationContext(env, reconcileScheduledPayments).catch(
        (error) => {
          console.error(
            "DOKU scheduled reconciliation failed",
            JSON.stringify({
              category: "batch_processing_error",
              message: error instanceof Error ? error.message : "unknown_error",
            }),
          );
          throw error;
        },
      ),
    );
  },
};

export default worker;
