import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { transaction: mocks.transaction } }));

import { invitations, payments, userProfiles } from "@/lib/db/schema";
import type { Database } from "@/lib/db";
import { applyDokuResult, PaymentResultError } from "./grant";

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
    refundRecordedAt: null,
    refundMetadata: null,
    createdAt: new Date("2026-09-22T10:00:00Z"),
    ...overrides,
  };
}

function fullRefund() {
  return {
    invoiceNumber: "NGUNL-test",
    amount: 49_000,
    currency: "IDR",
    status: "REFUNDED" as const,
    refund: { id: "refund-1", amount: 49_000 },
  };
}

function success(amount = 49_000) {
  return {
    invoiceNumber: "NGUNL-test",
    amount,
    currency: "IDR",
    status: "SUCCESS" as const,
  };
}

function transactionHarness(
  storedPayment: ReturnType<typeof payment>,
  options: {
    invitation?: Record<string, unknown>;
    failInvitationUpdateOnce?: boolean;
    failPaymentUpdateOnce?: boolean;
  } = {},
) {
  const storedInvitation = {
    isPaid: storedPayment.status === "paid",
    plan: storedPayment.status === "paid" ? "basic" : "free_trial",
    hasWatermark: storedPayment.status !== "paid",
    isEditLocked: false,
    editExpiresAt: new Date("2026-09-25T10:00:00Z"),
    paidAt: storedPayment.paidAt,
    ...options.invitation,
  };
  let paymentUpdates = 0;
  let invitationUpdates = 0;
  let profileInserts = 0;
  let failInvitationUpdateOnce = options.failInvitationUpdateOnce ?? false;
  let failPaymentUpdateOnce = options.failPaymentUpdateOnce ?? false;

  const tx = {
    select: () => ({
      from: (table: unknown) => {
        if (table === payments) {
          return {
            where: () => ({
              limit: () => ({ for: async () => [storedPayment] }),
            }),
          };
        }
        return {
          where: () => ({ limit: async () => [storedInvitation] }),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          if (table === payments) {
            if (failPaymentUpdateOnce) {
              failPaymentUpdateOnce = false;
              throw new Error("forced payment update failure");
            }
            paymentUpdates += 1;
            Object.assign(storedPayment, values);
          } else if (table === invitations) {
            if (failInvitationUpdateOnce) {
              failInvitationUpdateOnce = false;
              throw new Error("forced invitation update failure");
            }
            invitationUpdates += 1;
            Object.assign(storedInvitation, values);
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

  return {
    tx,
    storedInvitation,
    stats: () => ({ paymentUpdates, invitationUpdates, profileInserts }),
  };
}

function useTransactionHarness(
  storedPayment: ReturnType<typeof payment>,
  options: Parameters<typeof transactionHarness>[1] = {},
) {
  const harness = transactionHarness(storedPayment, options);
  mocks.transaction.mockImplementation(async (callback) =>
    callback(harness.tx),
  );
  return harness;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyDokuResult", () => {
  it("fulfills a later trusted SUCCESS after an ambiguous checkout", async () => {
    const storedPayment = payment({ status: "pending" });
    const harness = useTransactionHarness(storedPayment);

    await expect(
      applyDokuResult(success(), { source: "reconciliation" }),
    ).resolves.toMatchObject({
      status: "paid",
      transitioned: true,
      fulfilled: true,
    });
    await expect(
      applyDokuResult(success(), { source: "webhook", requestId: "retry-1" }),
    ).resolves.toMatchObject({
      status: "paid",
      transitioned: false,
      fulfilled: false,
    });
    expect(harness.stats()).toMatchObject({
      invitationUpdates: 1,
      profileInserts: 1,
    });
  });

  it.each(["expired", "failed"] as const)(
    "keeps the existing %s state terminal for delayed SUCCESS",
    async (status) => {
      const storedPayment = payment({ status });
      const harness = useTransactionHarness(storedPayment);

      await expect(
        applyDokuResult(success(), { source: "reconciliation" }),
      ).resolves.toMatchObject({
        status,
        transitioned: false,
        fulfilled: false,
      });
      expect(harness.stats()).toEqual({
        paymentUpdates: 0,
        invitationUpdates: 0,
        profileInserts: 0,
      });
    },
  );

  it("rejects mismatched amount and currency before changing payment state", async () => {
    const storedPayment = payment();
    const harness = useTransactionHarness(storedPayment);

    await expect(
      applyDokuResult(
        { ...success(), amount: 1 },
        { source: "reconciliation" },
      ),
    ).rejects.toEqual(new PaymentResultError("amount_mismatch"));
    await expect(
      applyDokuResult(
        { ...success(), currency: "USD" },
        { source: "reconciliation" },
      ),
    ).rejects.toEqual(new PaymentResultError("currency_mismatch"));
    expect(harness.stats().paymentUpdates).toBe(0);
  });

  it("uses the explicitly injected invocation database", async () => {
    const storedPayment = payment({ status: "paid" });
    const harness = transactionHarness(storedPayment);
    const injectedTransaction = vi.fn(async (callback) => callback(harness.tx));

    await expect(
      applyDokuResult(success(), { source: "reconciliation" }, {
        transaction: injectedTransaction,
      } as unknown as Database),
    ).resolves.toMatchObject({
      status: "paid",
      transitioned: false,
      fulfilled: false,
      reviewRequired: false,
    });
    expect(injectedTransaction).toHaveBeenCalledOnce();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("fulfills SUCCESS once and rolls back for a retry after a transient failure", async () => {
    const storedPayment = payment();
    const harness = transactionHarness(storedPayment, {
      failInvitationUpdateOnce: true,
    });
    mocks.transaction.mockImplementation(async (callback) => {
      const snapshot = { ...storedPayment };
      try {
        return await callback(harness.tx);
      } catch (error) {
        Object.assign(storedPayment, snapshot);
        throw error;
      }
    });

    await expect(
      applyDokuResult(success(), { source: "webhook" }),
    ).rejects.toThrow("forced invitation update failure");
    expect(storedPayment.status).toBe("pending");

    await expect(
      applyDokuResult(success(), { source: "webhook" }),
    ).resolves.toMatchObject({ status: "paid", fulfilled: true });
    await expect(
      applyDokuResult(success(), { source: "status_query" }),
    ).resolves.toMatchObject({ status: "paid", fulfilled: false });
    expect(harness.stats()).toMatchObject({
      invitationUpdates: 1,
      profileInserts: 1,
    });
  });

  it.each([
    ["basic", "active", false, 49_000],
    ["premium", "expired", true, 99_000],
  ] as const)(
    "unlocks %s from an %s trial without deleting existing artifacts",
    async (planTier, trialState, expired, amount) => {
      void trialState;
      const storedPayment = payment({
        amount: `${amount}.00`,
        planTier,
      });
      const harness = useTransactionHarness(storedPayment, {
        invitation: {
          isPaid: false,
          plan: "free_trial",
          hasWatermark: true,
          isEditLocked: expired,
          editExpiresAt: expired
            ? new Date("2020-01-01T00:00:00Z")
            : new Date("2099-01-01T00:00:00Z"),
        },
      });

      await expect(
        applyDokuResult(success(amount), { source: "webhook" }),
      ).resolves.toMatchObject({ status: "paid", fulfilled: true });
      expect(harness.storedInvitation).toMatchObject({
        isPaid: true,
        plan: planTier,
        hasWatermark: false,
        isEditLocked: false,
        editExpiresAt: null,
      });
      expect(harness.stats()).toMatchObject({
        invitationUpdates: 1,
        profileInserts: 1,
      });
    },
  );

  it("keeps duplicate SUCCESS idempotent before recording REFUNDED", async () => {
    const originalPaidAt = new Date("2026-09-22T10:05:00Z");
    const originalEvidence = { transaction: { status: "SUCCESS" } };
    const storedPayment = payment({
      status: "paid",
      paidAt: originalPaidAt,
      rawWebhook: originalEvidence,
    });
    const harness = useTransactionHarness(storedPayment, {
      invitation: {
        isPaid: true,
        plan: "basic",
        hasWatermark: false,
        paidAt: originalPaidAt,
      },
    });
    const invitationBefore = { ...harness.storedInvitation };

    await expect(
      applyDokuResult(success(), { source: "status_query" }),
    ).resolves.toMatchObject({ status: "paid", fulfilled: false });

    await expect(
      applyDokuResult(fullRefund(), { source: "webhook", requestId: "req-1" }),
    ).resolves.toMatchObject({
      status: "refunded",
      transitioned: true,
      fulfilled: false,
      reviewRequired: false,
    });

    expect(storedPayment.status).toBe("refunded");
    expect(storedPayment.paidAt).toBe(originalPaidAt);
    expect(storedPayment.rawWebhook).toBe(originalEvidence);
    expect(storedPayment.refundRecordedAt).toBeInstanceOf(Date);
    expect(storedPayment.refundMetadata).toMatchObject({
      evidence: "full",
      refundAmount: 49_000,
      refundId: "refund-1",
      entitlementReviewRequired: false,
    });
    expect(harness.storedInvitation).toEqual(invitationBefore);
    expect(harness.stats()).toEqual({
      paymentUpdates: 1,
      invitationUpdates: 0,
      profileInserts: 0,
    });
  });

  it("makes duplicate REFUNDED and delayed provider events no-ops", async () => {
    const storedPayment = payment({ status: "paid", paidAt: new Date() });
    const harness = useTransactionHarness(storedPayment);

    await applyDokuResult(fullRefund(), { source: "webhook" });
    const firstRecordedAt = storedPayment.refundRecordedAt;
    await expect(
      applyDokuResult(fullRefund(), { source: "webhook" }),
    ).resolves.toMatchObject({ status: "refunded", transitioned: false });
    for (const status of ["SUCCESS", "PENDING", "FAILED"] as const) {
      await expect(
        applyDokuResult({ ...success(), status }, { source: "status_query" }),
      ).resolves.toMatchObject({
        status: "refunded",
        transitioned: false,
        fulfilled: false,
      });
    }

    expect(storedPayment.refundRecordedAt).toBe(firstRecordedAt);
    expect(harness.stats()).toMatchObject({
      paymentUpdates: 1,
      invitationUpdates: 0,
      profileInserts: 0,
    });
  });

  it("rolls back a failed refund write and succeeds on provider retry", async () => {
    const storedPayment = payment({ status: "paid", paidAt: new Date() });
    const harness = transactionHarness(storedPayment, {
      failPaymentUpdateOnce: true,
    });
    mocks.transaction.mockImplementation(async (callback) => {
      const snapshot = { ...storedPayment };
      try {
        return await callback(harness.tx);
      } catch (error) {
        Object.assign(storedPayment, snapshot);
        throw error;
      }
    });

    await expect(
      applyDokuResult(fullRefund(), { source: "webhook" }),
    ).rejects.toThrow("forced payment update failure");
    expect(storedPayment.status).toBe("paid");
    expect(storedPayment.refundRecordedAt).toBeNull();

    await expect(
      applyDokuResult(fullRefund(), { source: "webhook" }),
    ).resolves.toMatchObject({ status: "refunded", transitioned: true });
    expect(storedPayment.status).toBe("refunded");
  });

  it("records a full refund before fulfillment without granting anything", async () => {
    const storedPayment = payment();
    const harness = useTransactionHarness(storedPayment, {
      invitation: { isPaid: false },
    });

    await expect(
      applyDokuResult(fullRefund(), { source: "webhook" }),
    ).resolves.toMatchObject({
      status: "refunded",
      fulfilled: false,
      reviewRequired: false,
    });
    await expect(
      applyDokuResult(success(), { source: "status_query" }),
    ).resolves.toMatchObject({ status: "refunded", fulfilled: false });
    expect(harness.stats()).toEqual({
      paymentUpdates: 1,
      invitationUpdates: 0,
      profileInserts: 0,
    });
  });

  it("flags inconsistent pre-fulfillment invitation entitlement for review", async () => {
    const storedPayment = payment();
    useTransactionHarness(storedPayment, { invitation: { isPaid: true } });

    await expect(
      applyDokuResult(fullRefund(), { source: "webhook" }),
    ).resolves.toMatchObject({
      status: "refunded",
      reviewRequired: true,
    });
    expect(storedPayment.refundMetadata).toMatchObject({
      entitlementReviewRequired: true,
    });
  });

  it.each(["expired", "failed"] as const)(
    "allows a verified full refund to supersede %s",
    async (status) => {
      const storedPayment = payment({ status });
      const harness = useTransactionHarness(storedPayment);

      await expect(
        applyDokuResult(fullRefund(), { source: "refund_reconciliation" }),
      ).resolves.toMatchObject({ status: "refunded", transitioned: true });
      expect(harness.stats()).toMatchObject({
        invitationUpdates: 0,
        profileInserts: 0,
      });
    },
  );

  it.each([
    ["partial", { id: "refund-part", amount: 10_000 }],
    ["ambiguous", undefined],
  ] as const)(
    "routes %s refund evidence to manual review",
    async (evidence, refund) => {
      const rawWebhook = { transaction: { status: "SUCCESS" } };
      const storedPayment = payment({ status: "paid", rawWebhook });
      const harness = useTransactionHarness(storedPayment);

      await expect(
        applyDokuResult({ ...fullRefund(), refund }, { source: "webhook" }),
      ).resolves.toMatchObject({
        status: "paid",
        transitioned: false,
        reviewRequired: true,
      });
      expect(storedPayment.refundMetadata).toMatchObject({
        evidence,
        reviewRequired: true,
      });
      expect(storedPayment.status).toBe("paid");
      expect(storedPayment.rawWebhook).toBe(rawWebhook);
      expect(harness.stats()).toMatchObject({
        invitationUpdates: 0,
        profileInserts: 0,
      });

      if (storedPayment.status === "pending") {
        await expect(
          applyDokuResult(success(), { source: "status_query" }),
        ).resolves.toMatchObject({
          status: "pending",
          fulfilled: false,
          reviewRequired: true,
        });
      }
    },
  );

  it("blocks SUCCESS while a pre-fulfillment ambiguous refund awaits review", async () => {
    const storedPayment = payment();
    const harness = useTransactionHarness(storedPayment);

    await applyDokuResult(
      { ...fullRefund(), refund: undefined },
      { source: "webhook" },
    );
    await expect(
      applyDokuResult(success(), { source: "status_query" }),
    ).resolves.toMatchObject({
      status: "pending",
      fulfilled: false,
      reviewRequired: true,
    });
    expect(harness.stats()).toMatchObject({
      invitationUpdates: 0,
      profileInserts: 0,
    });
  });

  it("serializes concurrent callback SUCCESS and webhook REFUNDED", async () => {
    const storedPayment = payment();
    const harness = transactionHarness(storedPayment);
    let queue = Promise.resolve<unknown>(undefined);
    mocks.transaction.mockImplementation((callback) => {
      const run = queue.then(() => callback(harness.tx));
      queue = run.catch(() => undefined);
      return run;
    });

    const [callback, webhook] = await Promise.all([
      applyDokuResult(success(), { source: "status_query" }),
      applyDokuResult(fullRefund(), { source: "webhook" }),
    ]);

    expect(callback).toMatchObject({ status: "paid", fulfilled: true });
    expect(webhook).toMatchObject({ status: "refunded", fulfilled: false });
    expect(storedPayment.status).toBe("refunded");
    expect(harness.stats()).toMatchObject({
      invitationUpdates: 1,
      profileInserts: 1,
    });
  });
});
