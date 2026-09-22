import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAuthorizedCron: vi.fn(),
  isPaymentConfigured: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  isAuthorizedCron: mocks.isAuthorizedCron,
}));
vi.mock("@/lib/payments/doku", () => ({
  isPaymentConfigured: mocks.isPaymentConfigured,
}));
vi.mock("@/lib/payments/reconcile", () => ({
  reconcilePendingDokuPayments: mocks.reconcile,
}));

import { GET } from "./route";

const success = {
  selected: 1,
  checked: 1,
  transitioned: 1,
  fulfilled: 1,
  statuses: { paid: 1, expired: 0, failed: 0, pending: 0 },
  errors: 0,
  truncated: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.isAuthorizedCron.mockReturnValue(true);
  mocks.isPaymentConfigured.mockReturnValue(true);
  mocks.reconcile.mockResolvedValue(success);
});

describe("GET /api/cron/reconcile-doku-payments", () => {
  it("rejects requests without valid cron authorization", async () => {
    mocks.isAuthorizedCron.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/cron/test"));

    expect(response.status).toBe(401);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("fails closed when DOKU credentials are missing", async () => {
    mocks.isPaymentConfigured.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/cron/test"));

    expect(response.status).toBe(503);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("returns the safe aggregate summary", async () => {
    const response = await GET(new Request("http://localhost/api/cron/test"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(success);
  });

  it("surfaces partial provider failures without discarding the summary", async () => {
    const partial = {
      ...success,
      checked: 0,
      transitioned: 0,
      fulfilled: 0,
      statuses: { paid: 0, expired: 0, failed: 0, pending: 0 },
      errors: 1,
    };
    mocks.reconcile.mockResolvedValue(partial);

    const response = await GET(new Request("http://localhost/api/cron/test"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(partial);
  });

  it("returns 500 for a batch-level failure", async () => {
    mocks.reconcile.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request("http://localhost/api/cron/test"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "reconciliation_failed",
    });
  });
});
