import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDb: vi.fn(),
  isPaymentConfigured: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("vinext/server/fetch-handler", () => ({
  default: { fetch: mocks.fetch },
}));
vi.mock("@/lib/payments/doku", () => ({
  isPaymentConfigured: mocks.isPaymentConfigured,
}));
vi.mock("@/lib/payments/reconcile", () => ({
  reconcilePendingDokuPayments: mocks.reconcile,
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import worker from "../worker/index";
import { getWorkerEnv, type NgaturiWorkerEnv } from "@/lib/runtime/context";

const successfulSummary = {
  selected: 1,
  checked: 1,
  transitioned: 1,
  fulfilled: 1,
  reviewRequired: 0,
  statuses: { paid: 1, expired: 0, failed: 0, pending: 0, refunded: 0 },
  errors: 0,
  truncated: false,
};

function completeEnv(): NgaturiWorkerEnv {
  return {
    HYPERDRIVE: { connectionString: "postgresql://worker-test" },
    MEDIA_BUCKET: { put: vi.fn(), get: vi.fn() },
    R2_PUBLIC_URL: "https://media.example.com",
    IMAGES: { info: vi.fn(), input: vi.fn() },
    ASSETS: { fetch: vi.fn() },
    REDIS_REST_URL: "https://redis.example.com",
    REDIS_REST_TOKEN: "test-token",
  };
}

function executionContext() {
  let pending: Promise<unknown> | undefined;
  return {
    context: {
      waitUntil(promise: Promise<unknown>) {
        pending = promise;
      },
    },
    pending: () => pending,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockResolvedValue(new Response("ok"));
  mocks.getDb.mockReturnValue({ database: true });
  mocks.isPaymentConfigured.mockReturnValue(true);
  mocks.reconcile.mockResolvedValue(successfulSummary);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Cloudflare Worker entrypoint", () => {
  it("fails before dispatch when a required binding is absent", () => {
    const ctx = executionContext();

    expect(() =>
      worker.fetch(new Request("https://worker.test"), {}, ctx.context),
    ).toThrow("Worker runtime configuration is incomplete");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("propagates one request-scoped environment into the vinext handler", async () => {
    const env = completeEnv();
    const ctx = executionContext();
    mocks.fetch.mockImplementation(async () => {
      expect(getWorkerEnv()).toBe(env);
      await Promise.resolve();
      expect(getWorkerEnv()).toBe(env);
      return new Response("worker-ok");
    });

    const response = await worker.fetch(
      new Request("https://worker.test"),
      env,
      ctx.context,
    );

    expect(await response.text()).toBe("worker-ok");
    expect(getWorkerEnv()).toBeUndefined();
  });

  it("schedules one bounded reconciliation promise with the invocation database", async () => {
    const env = completeEnv();
    const ctx = executionContext();
    const database = { database: true };
    mocks.getDb.mockReturnValue(database);

    worker.scheduled(
      { cron: "*/5 * * * *", scheduledTime: Date.now() },
      env,
      ctx.context,
    );

    expect(ctx.pending()).toBeInstanceOf(Promise);
    await expect(ctx.pending()).resolves.toBeUndefined();
    expect(mocks.reconcile).toHaveBeenCalledOnce();
    expect(mocks.reconcile).toHaveBeenCalledWith({ database });
    expect(getWorkerEnv()).toBeUndefined();
  });

  it("skips scheduled provider work when payments are disabled", async () => {
    const ctx = executionContext();
    mocks.isPaymentConfigured.mockReturnValue(false);

    worker.scheduled(
      { cron: "*/5 * * * *", scheduledTime: Date.now() },
      completeEnv(),
      ctx.context,
    );

    await expect(ctx.pending()).resolves.toBeUndefined();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("reports a partial batch failure to the platform for retry", async () => {
    const ctx = executionContext();
    mocks.reconcile.mockResolvedValue({ ...successfulSummary, errors: 1 });

    worker.scheduled(
      { cron: "*/5 * * * *", scheduledTime: Date.now() },
      completeEnv(),
      ctx.context,
    );

    await expect(ctx.pending()).rejects.toThrow(
      "DOKU scheduled reconciliation completed with errors",
    );
    expect(console.error).toHaveBeenCalledWith(
      "DOKU scheduled reconciliation failed",
      expect.stringContaining("batch_processing_error"),
    );
  });
});
