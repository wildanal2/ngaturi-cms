import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("POST /api/payments/create", () => {
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
      expect((await POST(request(purchase))).status).toBe(409);
      expect(mocks.createPayment).not.toHaveBeenCalled();
      expect(tx.insertValues).not.toHaveBeenCalled();
    },
  );
  it("marks only authenticated definitive rejection failed", async () => {
    mocks.transaction.mockImplementation(async (callback) =>
      callback(checkoutTransaction()),
    );
    mocks.createPayment.mockRejectedValue(
      new PaymentProviderError("provider_rejected", "rejected"),
    );
    expect((await POST(request(purchase))).status).toBe(502);
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
    expect((await POST(request(purchase))).status).toBe(502);
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
    expect(await response.json()).not.toHaveProperty("redirectUrl");
  });
});
