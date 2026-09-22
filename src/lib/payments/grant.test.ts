import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { transaction: mocks.transaction } }));

import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { applyDokuResult, PaymentResultError } from "./grant";

function lockedRows<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => ({ limit: () => ({ for: async () => rows }) }),
    }),
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    userId: "user-1",
    invitationId: "00000000-0000-0000-0000-000000000001",
    provider: "doku",
    providerPaymentId: "session-1",
    providerOrderId: "NGUNL-test",
    amount: "49000.00",
    currency: "IDR",
    status: "pending",
    kind: "invitation_unlock",
    planTier: "basic",
    grantUntil: null,
    rawWebhook: null,
    paidAt: null,
    createdAt: new Date("2026-09-22T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyDokuResult", () => {
  it("rejects a mismatched amount before changing payment state", async () => {
    const update = vi.fn();
    const tx = {
      select: () => lockedRows([payment()]),
      update,
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      applyDokuResult(
        {
          invoiceNumber: "NGUNL-test",
          amount: 1,
          currency: "IDR",
          status: "SUCCESS",
        },
        { source: "reconciliation" },
      ),
    ).rejects.toEqual(new PaymentResultError("amount_mismatch"));
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an explicit currency mismatch before fulfillment", async () => {
    const update = vi.fn();
    const tx = {
      select: () => lockedRows([payment()]),
      update,
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      applyDokuResult(
        {
          invoiceNumber: "NGUNL-test",
          amount: 49_000,
          currency: "USD",
          status: "SUCCESS",
        },
        { source: "reconciliation" },
      ),
    ).rejects.toEqual(new PaymentResultError("currency_mismatch"));
    expect(update).not.toHaveBeenCalled();
  });

  it("fulfills a signed success once across duplicate reconciliation", async () => {
    const storedPayment = payment();
    let paymentUpdates = 0;
    let invitationUpdates = 0;
    let profileInserts = 0;

    const tx = {
      select: () => lockedRows([storedPayment]),
      update: (table: unknown) => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => {
            if (table === payments) {
              paymentUpdates += 1;
              Object.assign(storedPayment, values);
            } else if (table === invitations) {
              invitationUpdates += 1;
            }
          },
        }),
      }),
      insert: (table: unknown) => ({
        values: () => ({
          onConflictDoUpdate: async () => {
            if (table === userProfiles) profileInserts += 1;
          },
        }),
      }),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const trustedResult = {
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      status: "SUCCESS" as const,
    };
    const first = await applyDokuResult(trustedResult, {
      source: "reconciliation",
    });
    const duplicate = await applyDokuResult(trustedResult, {
      source: "reconciliation",
    });

    expect(first).toMatchObject({
      status: "paid",
      transitioned: true,
      fulfilled: true,
    });
    expect(duplicate).toMatchObject({
      status: "paid",
      transitioned: false,
      fulfilled: false,
    });
    expect(paymentUpdates).toBe(1);
    expect(invitationUpdates).toBe(1);
    expect(profileInserts).toBe(1);
    expect(storedPayment.rawWebhook).toMatchObject({
      source: "reconciliation",
      order: { currency: "IDR" },
    });
  });
});
