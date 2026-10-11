import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  apply: vi.fn(),
  getDb: vi.fn(() => ({ database: true })),
}));
vi.mock("@/lib/db", () => ({ db: {}, getDb: mocks.getDb }));
vi.mock("@/lib/payments/grant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments/grant")>()),
  applyPaymentObservation: mocks.apply,
}));
import { POST as dokuWebhook } from "./route";
import { POST as sumopodWebhook } from "../sumopod/route";
import { PaymentResultError } from "@/lib/payments/grant";
import { env } from "@/lib/env";
const original = {
  PAYMENT_PROVIDER: env.PAYMENT_PROVIDER,
  DOKU_CLIENT_ID: env.DOKU_CLIENT_ID,
  DOKU_SECRET_KEY: env.DOKU_SECRET_KEY,
  SUMOPOD_WEBHOOK_TOKEN: env.SUMOPOD_WEBHOOK_TOKEN,
  SUMOPOD_WEBHOOK_SECRET: env.SUMOPOD_WEBHOOK_SECRET,
};
beforeEach(() => {
  vi.clearAllMocks();
  env.DOKU_CLIENT_ID = "test-client";
  env.DOKU_SECRET_KEY = "test-secret";
  env.SUMOPOD_WEBHOOK_TOKEN = "test-token";
  env.SUMOPOD_WEBHOOK_SECRET = undefined;
  mocks.apply.mockResolvedValue({
    paymentId: "payment-1",
    status: "paid",
    transitioned: true,
    fulfilled: true,
    reviewRequired: false,
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => Object.assign(env, original));
function signedDoku(body: unknown, path = "/payment/webhook/doku") {
  const raw = JSON.stringify(body);
  const headers = new Headers({
    "Client-Id": "test-client",
    "Request-Id": "req-1",
    "Request-Timestamp": "2026-09-21T07:00:00Z",
  });
  const signature = createHmac("sha256", "test-secret")
    .update(
      [
        "Client-Id:test-client",
        "Request-Id:req-1",
        "Request-Timestamp:2026-09-21T07:00:00Z",
        `Request-Target:${path}`,
        `Digest:${createHash("sha256").update(raw).digest("base64")}`,
      ].join("\n"),
    )
    .digest("base64");
  headers.set("Signature", `HMACSHA256=${signature}`);
  return new Request(`https://example.com${path}`, {
    method: "POST",
    headers,
    body: raw,
  });
}
const success = {
  order: { invoice_number: "NGUNL-test", amount: 49_000, currency: "IDR" },
  transaction: { status: "SUCCESS" },
};
function sumopodRequest(status = "completed") {
  return new Request("https://example.com/payment/webhook/sumopod", {
    method: "POST",
    headers: { "x-webhook-token": "test-token" },
    body: JSON.stringify({
      event_type: `payment.${status}`,
      data: {
        payment_id: "d4f7134c-ef0d-44b6-9e98-745a283221d8",
        order_id: "NGUNL-test",
        amount: 49_000,
        status,
      },
    }),
  });
}

describe("fixed-provider verified webhook routing", () => {
  it("processes historical DOKU while Sumopod creates new payments", async () => {
    env.PAYMENT_PROVIDER = "sumopod";
    expect((await dokuWebhook(signedDoku(success))).status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "doku",
        amount: "49000.00",
        status: "paid",
      }),
      { source: "webhook", requestId: "req-1" },
      { database: true },
    );
  });
  it("processes historical Sumopod after switching creation back to DOKU", async () => {
    env.PAYMENT_PROVIDER = "doku";
    expect((await sumopodWebhook(sumopodRequest())).status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "sumopod", status: "paid" }),
      { source: "webhook", requestId: null },
      { database: true },
    );
  });
  it("preserves full and ambiguous DOKU refund evidence", async () => {
    const body = {
      ...success,
      transaction: { status: "REFUNDED" },
      refund: { id: "refund-1", amount: 49_000 },
    };
    expect((await dokuWebhook(signedDoku(body))).status).toBe(200);
    expect(mocks.apply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "refunded",
        refund: { id: "refund-1", amount: "49000.00" },
      }),
      expect.anything(),
      expect.anything(),
    );
    expect(
      (
        await dokuWebhook(
          signedDoku({
            order: { invoice_number: "NGUNL-test" },
            transaction: { status: "REFUNDED" },
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "refunded", amount: undefined }),
      expect.anything(),
      expect.anything(),
    );
  });
  it("keeps DOKU FAILED pending", async () => {
    expect(
      (
        await dokuWebhook(
          signedDoku({ ...success, transaction: { status: "FAILED" } }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
      expect.anything(),
      expect.anything(),
    );
  });
  it("rejects invalid DOKU signature before any database processing", async () => {
    const request = signedDoku(success);
    request.headers.set("Signature", "invalid");
    expect((await dokuWebhook(request)).status).toBe(401);
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("preserves the exact signed DOKU request path", async () => {
    const request = signedDoku(success, "/different/path");
    expect(
      (
        await dokuWebhook(
          new Request("https://example.com/payment/webhook/doku", request),
        )
      ).status,
    ).toBe(401);
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it("rejects invalid Sumopod token before database processing", async () => {
    const request = sumopodRequest();
    request.headers.set("x-webhook-token", "invalid");
    expect((await sumopodWebhook(request)).status).toBe(401);
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("rejects non-refund notifications without amount", async () => {
    expect(
      (
        await dokuWebhook(
          signedDoku({
            order: { invoice_number: "NGUNL-test" },
            transaction: { status: "SUCCESS" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it("acknowledges authenticated Sumopod test events without business processing", async () => {
    const request = new Request("https://example.com/payment/webhook/sumopod", {
      method: "POST",
      headers: { "x-webhook-token": "test-token" },
      body: '{"event_type":"payment.test"}',
    });
    expect((await sumopodWebhook(request)).status).toBe(200);
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it.each([
    ["unknown_payment", 404],
    ["wrong_provider", 422],
    ["amount_mismatch", 422],
    ["currency_mismatch", 422],
    ["provider_payment_id_mismatch", 422],
  ] as const)(
    "rejects verified but invalid business observation %s",
    async (code, expected) => {
      mocks.apply.mockRejectedValue(new PaymentResultError(code));
      expect((await sumopodWebhook(sumopodRequest())).status).toBe(expected);
    },
  );
  it("returns non-2xx for transient processing failures so providers can retry", async () => {
    mocks.apply.mockRejectedValue(new Error("transient database error"));
    expect((await dokuWebhook(signedDoku(success))).status).toBe(500);
    expect((await sumopodWebhook(sumopodRequest())).status).toBe(500);
  });
});
