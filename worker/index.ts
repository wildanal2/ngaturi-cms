import handler from "vinext/server/fetch-handler";
import { reconcilePayments } from "../src/lib/payments/reconcile";
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
  const summary = await reconcilePayments({ database: getDb() });
  console.info(
    "Payment scheduled reconciliation completed",
    JSON.stringify(summary),
  );
  if (summary.errors > 0) {
    throw new Error("Payment scheduled reconciliation completed with errors");
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
        () => {
          console.error(
            "Payment scheduled reconciliation failed",
            JSON.stringify({
              category: "batch_processing_error",
            }),
          );
          throw new Error("Scheduled payment reconciliation failed");
        },
      ),
    );
  },
};

export default worker;
