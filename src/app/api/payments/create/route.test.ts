import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  getSession: vi.fn(),
  isConfigured: vi.fn(),
  resolve: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  persistReference: vi.fn(),
  recordReferenceFailure: vi.fn(),
}));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/db", () => {
  const db = { transaction: mocks.transaction, update: mocks.update };
  return { db, getDb: () => db };
});
vi.mock("@/lib/payments/registry", () => ({
  resolveCheckoutProvider: mocks.resolve,
}));
vi.mock("@/lib/payments/reference", () => ({
  persistProviderReference: mocks.persistReference,
  recordProviderReferenceFailure: mocks.recordReferenceFailure,
}));
import { POST } from "./route";
import { PaymentProviderError } from "@/lib/payments/provider";
import { SumopodProvider, SUMOPOD_LIVE_BASE_URL } from "@/lib/payments/sumopod";
import {
  PAYMENT_PENDING_CODE,
  PAYMENT_PENDING_MESSAGE,
} from "@/lib/payments/checkout-feedback";

const provider = {
  name: "sumopod",
  isConfigured: mocks.isConfigured,
  createPayment: mocks.createPayment,
};
function lockedRows<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => ({ limit: () => ({ for: async () => rows }) }),
    }),
  };
}
function rows<T>(value: T[]) {
  return { from: () => ({ where: () => ({ limit: async () => value }) }) };
}
function request(body: object) {
  return new Request("http://localhost/api/payments/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function checkoutTransaction(isPaid = false, pending: object[] = []) {
  const insertValues = vi.fn(() => ({
    returning: async () => [{ id: "payment-1" }],
  }));
  return {
    select: vi
      .fn()
      .mockReturnValueOnce(
        lockedRows([
          { id: "invitation-1", userId: "user-1", isPaid, plan: "premium" },
        ]),
      )
      .mockReturnValueOnce(rows(pending)),
    insert: () => ({ values: insertValues }),
    insertValues,
  };
}
const purchase = {
  invitationId: "invitation-1",
  kind: "invitation_unlock",
  plan: "premium",
  amount: 1,
};
const sumopodId = "d4f7134c-ef0d-44b6-9e98-745a283221d8";
const linkId = "34553130-5d90-4262-a29e-edf8a12fface";
const liveCheckoutUrl = `https://checkout.pymnt.app/payment-links/${linkId}`;
const liveConfig = {
  baseUrl: SUMOPOD_LIVE_BASE_URL,
  liveEnabled: true,
  apiKey: "live-test-api-key-do-not-log",
  webhookToken: "test-webhook-token-do-not-log",
};
function liveResponse(paymentLinkUrl = liveCheckoutUrl) {
  mocks.resolve.mockReturnValue(new SumopodProvider(liveConfig));
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(init.body as string);
    return Response.json(
      {
        payment_id: sumopodId,
        order_id: payload.order_id,
        amount: payload.amount,
        status: "pending",
        payment_link_url: paymentLinkUrl,
        private_upstream_details: "raw-provider-response-do-not-log",
      },
      { status: 201 },
    );
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
beforeEach(() => {
  vi.clearAllMocks();
  provider.name = "sumopod";
  mocks.getSession.mockResolvedValue({
    user: { id: "user-1", name: "Test", email: "test@example.com" },
  });
  mocks.isConfigured.mockReturnValue(true);
  mocks.resolve.mockReturnValue(provider);
  mocks.createPayment.mockResolvedValue({
    redirectUrl: "https://pay.sumopod.com/pay/test",
    providerPaymentId: "provider-id",
  });
  mocks.persistReference.mockResolvedValue(undefined);
  mocks.updateSet.mockReturnValue({ where: async () => undefined });
  mocks.update.mockReturnValue({ set: mocks.updateSet });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/payments/create", () => {
  it("accepts the confirmed LIVE checkout format and persists its distinct provider reference", async () => {
    const tx = checkoutTransaction();
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    const fetch = liveResponse();
    const response = await POST(request(purchase));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectUrl: liveCheckoutUrl });
    const [url, init] = fetch.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    expect(url).toBe(`${SUMOPOD_LIVE_BASE_URL}/api/v1/payments`);
    expect(payload.amount).toBe(99000);
    expect(mocks.persistReference).toHaveBeenCalledWith(
      "payment-1",
      "sumopod",
      payload.order_id,
      sumopodId,
      expect.anything(),
    );
    expect(tx.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
    expect(fetch).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
  it.each([
    [
      "known host",
      `https://user:private-password@checkout.pymnt.app/payment-links/${linkId}?token=private-query#private-fragment`,
      "checkout.pymnt.app",
      "payment_links_uuid",
    ],
    [
      "unrecognized host",
      `https://private-token.evil.example/payment-links/${linkId}`,
      "unrecognized",
      "payment_links_uuid",
    ],
    [
      "sensitive path",
      "https://checkout.pymnt.app/private-path-token",
      "checkout.pymnt.app",
      "other",
    ],
  ])(
    "keeps an invalid checkout URL pending and logs safe metadata for %s",
    async (_description, link, hostname, pathType) => {
      mocks.transaction.mockImplementation(async (callback) =>
        callback(checkoutTransaction()),
      );
      const fetch = liveResponse(link);
      const response = await POST(request(purchase));
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        code: PAYMENT_PENDING_CODE,
        error: PAYMENT_PENDING_MESSAGE,
      });
      expect(mocks.persistReference).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledOnce();
      const [message, serialized] = vi.mocked(console.error).mock.calls[0];
      expect(message).toBe("Payment creation outcome");
      expect(JSON.parse(serialized as string)).toEqual({
        paymentId: "payment-1",
        provider: "sumopod",
        category: "provider_outcome_unknown",
        errorCode: "untrusted_checkout_url",
        outcome: "unknown",
        elapsedMs: expect.any(Number),
        upstreamStatus: 201,
        checkoutHostname: hostname,
        checkoutPathType: pathType,
      });
      const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
      for (const sensitive of [
        link,
        linkId,
        liveConfig.apiKey,
        liveConfig.webhookToken,
        "private-password",
        "private-query",
        "private-fragment",
        "private-token",
        "private-path-token",
        "raw-provider-response-do-not-log",
      ]) {
        expect(logged).not.toContain(sensitive);
      }
    },
  );
  it.each([
    "provider_timeout",
    "provider_transport_error",
    "sumopod_create_outcome_unknown",
    "invalid_provider_response",
    "provider_response_mismatch",
    "untrusted_checkout_url",
  ])(
    "retains safe error code %s without changing the public pending response",
    async (code) => {
      mocks.transaction.mockImplementation(async (callback) =>
        callback(checkoutTransaction()),
      );
      const clock = vi.spyOn(performance, "now").mockReturnValue(100);
      mocks.createPayment.mockImplementationOnce(async () => {
        clock.mockReturnValue(175);
        throw Object.assign(
          new PaymentProviderError(code, "unknown", { upstreamStatus: 503 }),
          {
            rawBody: "private-provider-response",
            apiKey: liveConfig.apiKey,
          },
        );
      });
      const response = await POST(request(purchase));
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        code: PAYMENT_PENDING_CODE,
        error: PAYMENT_PENDING_MESSAGE,
      });
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.createPayment).toHaveBeenCalledOnce();
      expect(mocks.persistReference).not.toHaveBeenCalled();
      const [, serialized] = vi.mocked(console.error).mock.calls[0];
      expect(JSON.parse(serialized as string)).toEqual({
        paymentId: "payment-1",
        provider: "sumopod",
        category: "provider_outcome_unknown",
        errorCode: code,
        outcome: "unknown",
        elapsedMs: 75,
        upstreamStatus: 503,
      });
      expect(serialized).not.toContain("private-provider-response");
      expect(serialized).not.toContain(liveConfig.apiKey);
    },
  );
  it("does not log unexpected error messages or stacks", async () => {
    mocks.transaction.mockImplementation(async (callback) =>
      callback(checkoutTransaction()),
    );
    mocks.createPayment.mockRejectedValueOnce(
      new Error(`private-provider-response ${liveConfig.apiKey}`),
    );
    const response = await POST(request(purchase));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: PAYMENT_PENDING_CODE,
      error: PAYMENT_PENDING_MESSAGE,
    });
    const [, serialized] = vi.mocked(console.error).mock.calls[0];
    expect(JSON.parse(serialized as string)).toMatchObject({
      errorCode: "unexpected_provider_error",
      outcome: "unknown",
    });
    expect(serialized).not.toContain("private-provider-response");
    expect(serialized).not.toContain(liveConfig.apiKey);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("commits durable Sumopod attempt before HTTP, derives price server-side, and preserves redirect contract", async () => {
    const tx = checkoutTransaction();
    let committed = false;
    mocks.transaction.mockImplementation(async (callback) => {
      const result = await callback(tx);
      committed = true;
      return result;
    });
    mocks.createPayment.mockImplementation(async () => {
      expect(committed).toBe(true);
      return {
        redirectUrl: "https://pay.sumopod.com/pay/test",
        providerPaymentId: "provider-id",
      };
    });
    const response = await POST(request(purchase));
    expect(response.status).toBe(200);
    expect(tx.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "sumopod",
        amount: "99000",
        status: "pending",
        currency: "IDR",
      }),
    );
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "99000" }),
    );
    const input = mocks.createPayment.mock.calls[0][0];
    expect(input.merchantReference).toMatch(/^NGUNL-[a-f0-9]{20}$/);
    expect(new URL(input.callbackUrl).searchParams.get("invoice")).toBe(
      input.merchantReference,
    );
    expect(mocks.persistReference).toHaveBeenCalledWith(
      "payment-1",
      "sumopod",
      input.merchantReference,
      "provider-id",
      expect.anything(),
    );
    expect(await response.json()).toEqual({
      redirectUrl: "https://pay.sumopod.com/pay/test",
    });
  });
  it("retains DOKU as selectable creation", async () => {
    provider.name = "doku";
    const tx = checkoutTransaction();
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    expect((await POST(request(purchase))).status).toBe(200);
    expect(tx.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "doku" }),
    );
  });
  it("rejects unauthenticated checkout before provider or DB access", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await POST(request(purchase))).status).toBe(401);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("returns safe 503 for missing selected credentials", async () => {
    mocks.isConfigured.mockReturnValue(false);
    expect((await POST(request(purchase))).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("returns safe 503 for an invalid selector", async () => {
    mocks.resolve.mockImplementation(() => {
      throw new PaymentProviderError(
        "unsupported_payment_provider",
        "unavailable",
      );
    });
    expect((await POST(request(purchase))).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects renewal for an unpaid invitation", async () => {
    mocks.transaction.mockImplementation(async (callback) =>
      callback(checkoutTransaction()),
    );
    expect(
      (await POST(request({ ...purchase, kind: "invitation_renewal" }))).status,
    ).toBe(400);
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("prices paid renewal server-side and retains the existing tier", async () => {
    const tx = checkoutTransaction(true);
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    expect(
      (
        await POST(
          request({ ...purchase, kind: "invitation_renewal", plan: "basic" }),
        )
      ).status,
    ).toBe(200);
    expect(tx.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "25000",
        planTier: "premium",
        kind: "invitation_renewal",
        grantUntil: null,
      }),
    );
  });
  it.each([new Date(), new Date("2020-01-01")])(
    "never expires pending attempts by age (%s)",
    async (createdAt) => {
      const tx = checkoutTransaction(false, [
        { id: "old-doku-payment", provider: "doku", createdAt },
      ]);
      mocks.transaction.mockImplementation(async (callback) => callback(tx));
      const response = await POST(request(purchase));
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        code: PAYMENT_PENDING_CODE,
        error: PAYMENT_PENDING_MESSAGE,
      });
      expect(mocks.createPayment).not.toHaveBeenCalled();
      expect(tx.insertValues).not.toHaveBeenCalled();
    },
  );
  it("marks only authenticated definitive rejection failed", async () => {
    provider.name = "doku";
    mocks.transaction.mockImplementation(async (callback) =>
      callback(checkoutTransaction()),
    );
    mocks.createPayment.mockRejectedValue(
      new PaymentProviderError("provider_rejected", "rejected"),
    );
    const response = await POST(request(purchase));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "payment_rejected" });
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });
  it("keeps unknown timeout pending without automatic fallback", async () => {
    mocks.transaction.mockImplementation(async (callback) =>
      callback(checkoutTransaction()),
    );
    mocks.createPayment.mockRejectedValue(
      new PaymentProviderError("provider_timeout"),
    );
    const response = await POST(request(purchase));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: PAYMENT_PENDING_CODE,
      error: PAYMENT_PENDING_MESSAGE,
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createPayment).toHaveBeenCalledOnce();
  });
  it("keeps an accepted payment recoverable and records review when reference binding fails", async () => {
    mocks.transaction.mockImplementation(async (callback) =>
      callback(checkoutTransaction()),
    );
    mocks.persistReference.mockRejectedValue(
      new Error("conflicting provider ID"),
    );
    const response = await POST(request(purchase));
    expect(response.status).toBe(502);
    expect(mocks.recordReferenceFailure).toHaveBeenCalledWith(
      "payment-1",
      expect.anything(),
    );
    expect(mocks.updateSet).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: PAYMENT_PENDING_CODE,
      error: PAYMENT_PENDING_MESSAGE,
    });
  });
});
