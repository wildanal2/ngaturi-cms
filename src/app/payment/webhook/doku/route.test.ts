import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applyDokuResult: vi.fn(),
  dokuResult: vi.fn((invoiceNumber, amount, status, currency, refund) => ({
    invoiceNumber,
    amount,
    status,
    currency,
    refund,
  })),
  getDb: vi.fn(() => ({ database: true })),
  isDokuStatus: vi.fn(() => true),
  verifyNotification: vi.fn(() => true),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/payments/doku", () => ({
  isDokuStatus: mocks.isDokuStatus,
  verifyNotification: mocks.verifyNotification,
}));
vi.mock("@/lib/payments/grant", () => ({
  applyDokuResult: mocks.applyDokuResult,
  dokuResult: mocks.dokuResult,
  PaymentResultError: class PaymentResultError extends Error {},
}));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  mocks.applyDokuResult.mockResolvedValue({
    paymentId: "payment-1",
    status: "refunded",
    transitioned: true,
    fulfilled: false,
    reviewRequired: false,
  });
});

function request(body: object) {
  return new Request("https://example.com/payment/webhook/doku", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Request-Id": "req-1" },
    body: JSON.stringify(body),
  });
}

describe("POST /payment/webhook/doku refund parsing", () => {
  it("forwards signed full-refund evidence to the shared transaction", async () => {
    const response = await POST(
      request({
        order: {
          invoice_number: "NGUNL-test",
          amount: 49_000,
          currency: "IDR",
        },
        transaction: { status: "REFUNDED" },
        refund: { id: "refund-1", amount: 49_000 },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.dokuResult).toHaveBeenCalledWith(
      "NGUNL-test",
      49_000,
      "REFUNDED",
      "IDR",
      { id: "refund-1", amount: 49_000 },
    );
    expect(mocks.applyDokuResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "REFUNDED" }),
      { requestId: "req-1", source: "webhook" },
      { database: true },
    );
  });

  it("accepts provider REFUNDED without amount so it can be stored for review", async () => {
    mocks.applyDokuResult.mockResolvedValueOnce({
      paymentId: "payment-1",
      status: "paid",
      transitioned: false,
      fulfilled: false,
      reviewRequired: true,
    });

    const response = await POST(
      request({
        order: { invoice_number: "NGUNL-test" },
        transaction: { status: "REFUNDED" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.dokuResult).toHaveBeenCalledWith(
      "NGUNL-test",
      undefined,
      "REFUNDED",
      undefined,
      undefined,
    );
  });

  it("rejects non-refund notifications without the original order amount", async () => {
    const response = await POST(
      request({
        order: { invoice_number: "NGUNL-test" },
        transaction: { status: "SUCCESS" },
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.applyDokuResult).not.toHaveBeenCalled();
  });
});
