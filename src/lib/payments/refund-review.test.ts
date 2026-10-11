import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { applyDokuResult } from "./legacy-doku";
import { reconcileDokuPaymentReference } from "./refund-reconcile";
import {
  RefundReviewResolutionError,
  resolveRefundReview,
} from "./refund-review";

function reviewedPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    userId: "user-1",
    invitationId: "00000000-0000-0000-0000-000000000001",
    provider: "doku",
    providerPaymentId: "session-1",
    providerOrderId: "NGUNL-review",
    amount: "49000.00",
    currency: "IDR",
    status: "pending",
    kind: "invitation_unlock",
    planTier: "basic",
    grantUntil: null,
    rawWebhook: { transaction: { status: "PENDING" } },
    paidAt: null,
    refundRecordedAt: null,
    refundMetadata: {
      evidence: "ambiguous",
      reviewRequired: true,
      source: "webhook",
      receivedAt: "2026-09-23T01:00:00.000Z",
      providerStatus: "REFUNDED",
      invoiceNumber: "NGUNL-review",
      orderAmount: 49_000,
      currency: "IDR",
    },
    createdAt: new Date("2026-09-23T00:00:00Z"),
    ...overrides,
  };
}

function success() {
  return {
    invoiceNumber: "NGUNL-review",
    amount: 49_000,
    currency: "IDR",
    status: "SUCCESS" as const,
  };
}

function harness(
  storedPayment: ReturnType<typeof reviewedPayment>,
  options: { failPaymentUpdateOnce?: boolean } = {},
) {
  const storedInvitation = {
    isPaid: false,
    plan: "free_trial",
    hasWatermark: true,
    paidAt: null,
  };
  let invitationUpdates = 0;
  let profileInserts = 0;
  let paymentUpdates = 0;
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
          where: () => ({
            limit: () =>
              Object.assign(Promise.resolve([storedInvitation]), {
                for: async () => [storedInvitation],
              }),
          }),
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

  let queue = Promise.resolve<unknown>(undefined);
  const database = {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [storedPayment] }) }),
    }),
    transaction: vi.fn((callback) => {
      const run = queue.then(async () => {
        const snapshot = structuredClone(storedPayment);
        try {
          return await callback(tx);
        } catch (error) {
          Object.assign(storedPayment, snapshot);
          throw error;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    }),
  } as unknown as Database;

  return {
    database,
    storedInvitation,
    stats: () => ({ paymentUpdates, invitationUpdates, profileInserts }),
  };
}

const operatorInput = {
  providerOrderId: "NGUNL-review",
  operator: "ops@example.com",
  reason: "Verified against merchant case CASE-123",
};

describe("resolveRefundReview", () => {
  it("confirms a pending review as a terminal refund without fulfillment", async () => {
    const storedPayment = reviewedPayment();
    const originalWebhook = storedPayment.rawWebhook;
    const testHarness = harness(storedPayment);

    await expect(
      resolveRefundReview(
        { ...operatorInput, decision: "confirm" },
        testHarness.database,
      ),
    ).resolves.toMatchObject({
      status: "refunded",
      resolved: true,
      transitioned: true,
      reviewRequired: false,
    });
    expect(storedPayment.rawWebhook).toBe(originalWebhook);
    expect(storedPayment.paidAt).toBeNull();
    expect(storedPayment.refundRecordedAt).toBeInstanceOf(Date);
    expect(storedPayment.refundMetadata).toMatchObject({
      reviewRequired: false,
      resolution: {
        decision: "confirm",
        operator: "ops@example.com",
        reason: "Verified against merchant case CASE-123",
      },
    });
    expect(
      (storedPayment.refundMetadata as unknown as { reviewHistory: unknown[] })
        .reviewHistory,
    ).toHaveLength(2);
    expect(testHarness.stats()).toEqual({
      paymentUpdates: 1,
      invitationUpdates: 0,
      profileInserts: 0,
    });

    await expect(
      applyDokuResult(
        success(),
        { source: "status_query" },
        testHarness.database,
      ),
    ).resolves.toMatchObject({ status: "refunded", fulfilled: false });
  });

  it("makes duplicate confirmations idempotent", async () => {
    const storedPayment = reviewedPayment();
    const testHarness = harness(storedPayment);
    const input = { ...operatorInput, decision: "confirm" as const };

    await resolveRefundReview(input, testHarness.database);
    const recordedAt = storedPayment.refundRecordedAt;
    await expect(
      resolveRefundReview(input, testHarness.database),
    ).resolves.toMatchObject({
      status: "refunded",
      resolved: false,
      transitioned: false,
    });
    expect(storedPayment.refundRecordedAt).toBe(recordedAt);
    expect(testHarness.stats().paymentUpdates).toBe(1);
  });

  it("rejects invalid evidence without marking paid, then uses signed status reconciliation", async () => {
    const storedPayment = reviewedPayment();
    const testHarness = harness(storedPayment);
    const input = { ...operatorInput, decision: "reject" as const };

    await expect(
      resolveRefundReview(input, testHarness.database),
    ).resolves.toMatchObject({
      status: "pending",
      resolved: true,
      transitioned: false,
      reviewRequired: true,
    });
    expect(storedPayment.status).toBe("pending");
    expect(testHarness.stats()).toEqual({
      paymentUpdates: 1,
      invitationUpdates: 0,
      profileInserts: 0,
    });

    const checkStatus = vi.fn().mockResolvedValue(success());
    await expect(
      reconcileDokuPaymentReference(
        "NGUNL-review",
        testHarness.database,
        checkStatus,
        applyDokuResult,
      ),
    ).resolves.toMatchObject({ status: "paid", fulfilled: true });
    expect(checkStatus).toHaveBeenCalledWith("NGUNL-review");
    expect(storedPayment.status).toBe("paid");
    expect(testHarness.stats()).toMatchObject({
      invitationUpdates: 1,
      profileInserts: 1,
    });

    await expect(
      resolveRefundReview(input, testHarness.database),
    ).resolves.toMatchObject({
      status: "paid",
      resolved: false,
      transitioned: false,
    });
  });

  it("blocks duplicate provider evidence until fresh signed reconciliation", async () => {
    const storedPayment = reviewedPayment();
    const testHarness = harness(storedPayment);
    await resolveRefundReview(
      { ...operatorInput, decision: "reject" },
      testHarness.database,
    );

    await expect(
      applyDokuResult(
        {
          invoiceNumber: "NGUNL-review",
          amount: 49_000,
          currency: "IDR",
          status: "REFUNDED",
        },
        { source: "webhook" },
        testHarness.database,
      ),
    ).resolves.toMatchObject({
      status: "pending",
      fulfilled: false,
      reviewRequired: true,
    });
    expect(testHarness.stats().paymentUpdates).toBe(1);

    const checkStatus = vi.fn().mockResolvedValue({
      invoiceNumber: "NGUNL-review",
      amount: 49_000,
      currency: "IDR",
      status: "REFUNDED" as const,
    });
    await expect(
      reconcileDokuPaymentReference(
        "NGUNL-review",
        testHarness.database,
        checkStatus,
        applyDokuResult,
      ),
    ).resolves.toMatchObject({
      status: "pending",
      fulfilled: false,
      reviewRequired: false,
    });
    expect(storedPayment.status).toBe("pending");
  });

  it("blocks a concurrent stale SUCCESS until operator reconciliation wins the row lock", async () => {
    const storedPayment = reviewedPayment();
    const testHarness = harness(storedPayment);
    await resolveRefundReview(
      { ...operatorInput, decision: "reject" },
      testHarness.database,
    );
    const checkStatus = vi.fn().mockResolvedValue(success());

    const [staleWebhook, reconciliation] = await Promise.all([
      applyDokuResult(success(), { source: "webhook" }, testHarness.database),
      reconcileDokuPaymentReference(
        "NGUNL-review",
        testHarness.database,
        checkStatus,
        applyDokuResult,
      ),
    ]);

    expect(staleWebhook).toMatchObject({
      status: "pending",
      fulfilled: false,
      reviewRequired: true,
    });
    expect(reconciliation).toMatchObject({ status: "paid", fulfilled: true });
    expect(storedPayment.status).toBe("paid");
    expect(testHarness.stats()).toMatchObject({
      invitationUpdates: 1,
      profileInserts: 1,
    });
  });

  it("serializes operator confirmation ahead of a concurrent SUCCESS", async () => {
    const storedPayment = reviewedPayment();
    const testHarness = harness(storedPayment);

    const [resolution, provider] = await Promise.all([
      resolveRefundReview(
        { ...operatorInput, decision: "confirm" },
        testHarness.database,
      ),
      applyDokuResult(success(), { source: "webhook" }, testHarness.database),
    ]);

    expect(resolution).toMatchObject({ status: "refunded" });
    expect(provider).toMatchObject({ status: "refunded", fulfilled: false });
    expect(storedPayment.status).toBe("refunded");
    expect(testHarness.stats()).toEqual({
      paymentUpdates: 1,
      invitationUpdates: 0,
      profileInserts: 0,
    });
  });

  it("rolls back a failed resolution so an operator can retry", async () => {
    const storedPayment = reviewedPayment();
    const testHarness = harness(storedPayment, {
      failPaymentUpdateOnce: true,
    });
    const input = { ...operatorInput, decision: "confirm" as const };

    await expect(
      resolveRefundReview(input, testHarness.database),
    ).rejects.toThrow("forced payment update failure");
    expect(storedPayment.status).toBe("pending");
    expect(
      (storedPayment.refundMetadata as { reviewRequired: boolean })
        .reviewRequired,
    ).toBe(true);

    await expect(
      resolveRefundReview(input, testHarness.database),
    ).resolves.toMatchObject({ status: "refunded", resolved: true });
  });

  it("requires an existing pending review and rejects conflicting resolutions", async () => {
    const withoutReview = reviewedPayment({ refundMetadata: null });
    const noReviewHarness = harness(withoutReview);
    await expect(
      resolveRefundReview(
        { ...operatorInput, decision: "confirm" },
        noReviewHarness.database,
      ),
    ).rejects.toEqual(new RefundReviewResolutionError("no_pending_review"));

    const reviewed = reviewedPayment();
    const reviewedHarness = harness(reviewed);
    await resolveRefundReview(
      { ...operatorInput, decision: "reject" },
      reviewedHarness.database,
    );
    await expect(
      resolveRefundReview(
        { ...operatorInput, decision: "confirm" },
        reviewedHarness.database,
      ),
    ).rejects.toEqual(
      new RefundReviewResolutionError("review_already_resolved"),
    );
  });
});
