import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckout: vi.fn(),
  getSession: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/db", () => {
  const db = { transaction: mocks.transaction, update: mocks.update };
  return { db, getDb: () => db };
});
vi.mock("@/lib/payments/doku", () => ({
  createCheckout: mocks.createCheckout,
  DOKU_CHECKOUT_DUE_MINUTES: 60,
  isPaymentConfigured: () => true,
}));

import { POST } from "./route";

function lockedRows<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => ({ limit: () => ({ for: async () => rows }) }),
    }),
  };
}

function rows<T>(value: T[]) {
  return {
    from: () => ({ where: () => ({ limit: async () => value }) }),
  };
}

function request(body: object) {
  return new Request("http://localhost/api/payments/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({
    user: { id: "user-1", name: "Test", email: "test@example.com" },
  });
  mocks.createCheckout.mockResolvedValue({
    url: "https://sandbox.doku.com/checkout-link-v2/token",
    tokenId: "token",
    sessionId: "session",
  });
  mocks.update.mockReturnValue({
    set: () => ({ where: async () => undefined }),
  });
});

describe("POST /api/payments/create", () => {
  it("uses the server plan price even when the client submits an amount", async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          lockedRows([{ id: "invitation-1", userId: "user-1", isPaid: false }]),
        )
        .mockReturnValueOnce(rows([])),
      insert: () => ({
        values: () => ({ returning: async () => [{ id: "payment-1" }] }),
      }),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(
      request({
        invitationId: "invitation-1",
        kind: "invitation_unlock",
        plan: "premium",
        amount: 1,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 99_000 }),
    );
    const checkoutRequest = mocks.createCheckout.mock.calls[0][0];
    expect(checkoutRequest.orderId).toMatch(/^NGUNL-[a-f0-9]{20}$/);
    expect(checkoutRequest.orderId.length).toBeLessThanOrEqual(30);
    const callbackUrl = new URL(checkoutRequest.callbackUrl);
    expect(`${callbackUrl.origin}${callbackUrl.pathname}`).toBe(
      "http://localhost:3030/payment/callback",
    );
    expect(callbackUrl.searchParams.get("invoice")).toBe(
      checkoutRequest.orderId,
    );
    await expect(response.json()).resolves.toEqual({
      redirectUrl: "https://sandbox.doku.com/checkout-link-v2/token",
    });
  });

  it("rejects the cheaper renewal path for an unpaid invitation", async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValue(
          lockedRows([{ id: "invitation-1", userId: "user-1", isPaid: false }]),
        ),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(
      request({
        invitationId: "invitation-1",
        kind: "invitation_renewal",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("creates a paid invitation renewal with trusted price and tier metadata", async () => {
    const insertValues = vi.fn(() => ({
      returning: async () => [{ id: "payment-renewal" }],
    }));
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          lockedRows([
            {
              id: "invitation-1",
              userId: "user-1",
              isPaid: true,
              plan: "premium",
            },
          ]),
        )
        .mockReturnValueOnce(rows([])),
      insert: () => ({ values: insertValues }),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(
      request({
        invitationId: "invitation-1",
        kind: "invitation_renewal",
        plan: "basic",
        amount: 1,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 25_000,
        itemName: "Perpanjangan undangan 90 hari",
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "invitation_renewal",
        planTier: "premium",
        grantUntil: null,
        amount: "25000",
      }),
    );
  });

  it("does not create another checkout while one is pending", async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          lockedRows([{ id: "invitation-1", userId: "user-1", isPaid: false }]),
        )
        .mockReturnValueOnce(
          rows([{ id: "pending-payment", createdAt: new Date() }]),
        ),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(
      request({
        invitationId: "invitation-1",
        kind: "invitation_unlock",
        plan: "basic",
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("expires an abandoned checkout before creating a replacement", async () => {
    const expirePending = vi.fn().mockResolvedValue(undefined);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          lockedRows([{ id: "invitation-1", userId: "user-1", isPaid: false }]),
        )
        .mockReturnValueOnce(
          rows([
            {
              id: "stale-payment",
              createdAt: new Date(Date.now() - 2 * 60 * 60_000),
            },
          ]),
        ),
      update: () => ({ set: () => ({ where: expirePending }) }),
      insert: () => ({
        values: () => ({ returning: async () => [{ id: "payment-2" }] }),
      }),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(
      request({
        invitationId: "invitation-1",
        kind: "invitation_unlock",
        plan: "basic",
      }),
    );

    expect(response.status).toBe(200);
    expect(expirePending).toHaveBeenCalledOnce();
    expect(mocks.createCheckout).toHaveBeenCalledOnce();
  });
});
