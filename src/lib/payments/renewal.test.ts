import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";
import { invitations, payments } from "@/lib/db/schema";
import { applyDokuResult } from "./grant";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function renewalPayment(
  id: string,
  providerOrderId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    userId: "user-1",
    invitationId: "00000000-0000-0000-0000-000000000001",
    provider: "doku",
    providerPaymentId: `session-${id}`,
    providerOrderId,
    amount: "25000.00",
    currency: "IDR",
    status: "pending",
    kind: "invitation_renewal",
    planTier: "renewal",
    grantUntil: null,
    rawWebhook: null,
    paidAt: null,
    refundRecordedAt: null,
    refundMetadata: null,
    createdAt: new Date("2026-09-23T00:00:00Z"),
    ...overrides,
  };
}

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    status: "published",
    expiresAt: new Date("2026-10-01T00:00:00Z"),
    plan: "premium",
    isPaid: true,
    hasWatermark: false,
    isEditLocked: false,
    editExpiresAt: null,
    paidAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function success(providerOrderId: string) {
  return {
    invoiceNumber: providerOrderId,
    amount: 25_000,
    currency: "IDR",
    status: "SUCCESS" as const,
  };
}

function fullRefund(providerOrderId: string) {
  return {
    invoiceNumber: providerOrderId,
    amount: 25_000,
    currency: "IDR",
    status: "REFUNDED" as const,
    refund: { id: `refund-${providerOrderId}`, amount: 25_000 },
  };
}

interface SharedState {
  invitation: ReturnType<typeof invitation> | null;
  queue: Promise<unknown>;
  failGrantUpdateOnce: boolean;
  paymentUpdates: number;
  invitationUpdates: number;
  invitationLocks: number;
}

function sharedState(
  storedInvitation: ReturnType<typeof invitation> | null,
  options: { failGrantUpdateOnce?: boolean } = {},
): SharedState {
  return {
    invitation: storedInvitation,
    queue: Promise.resolve(),
    failGrantUpdateOnce: options.failGrantUpdateOnce ?? false,
    paymentUpdates: 0,
    invitationUpdates: 0,
    invitationLocks: 0,
  };
}

function databaseFor(
  storedPayment: ReturnType<typeof renewalPayment>,
  shared: SharedState,
): Database {
  return {
    transaction: vi.fn((callback) => {
      const run = shared.queue.then(async () => {
        const paymentSnapshot = structuredClone(storedPayment);
        const invitationSnapshot = shared.invitation
          ? structuredClone(shared.invitation)
          : null;
        const statSnapshot = {
          paymentUpdates: shared.paymentUpdates,
          invitationUpdates: shared.invitationUpdates,
          invitationLocks: shared.invitationLocks,
        };

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
                  limit: () => ({
                    for: async () => {
                      shared.invitationLocks += 1;
                      return shared.invitation ? [shared.invitation] : [];
                    },
                  }),
                }),
              };
            },
          }),
          update: (table: unknown) => ({
            set: (values: Record<string, unknown>) => ({
              where: () => {
                let executed = false;
                const execute = async () => {
                  if (executed) return;
                  executed = true;
                  if (table === payments) {
                    if (shared.failGrantUpdateOnce && "grantUntil" in values) {
                      shared.failGrantUpdateOnce = false;
                      throw new Error("forced grant update failure");
                    }
                    shared.paymentUpdates += 1;
                    Object.assign(storedPayment, values);
                    return;
                  }
                  if (table === invitations) {
                    if (shared.invitation) {
                      shared.invitationUpdates += 1;
                      Object.assign(shared.invitation, values);
                    }
                  }
                };
                return {
                  then: (
                    resolve: (value: unknown) => void,
                    reject: (error: unknown) => void,
                  ) => execute().then(resolve, reject),
                  returning: async () => {
                    await execute();
                    return shared.invitation
                      ? [{ expiresAt: shared.invitation.expiresAt }]
                      : [];
                  },
                };
              },
            }),
          }),
        };

        try {
          return await callback(tx);
        } catch (error) {
          Object.assign(storedPayment, paymentSnapshot);
          shared.invitation = invitationSnapshot;
          Object.assign(shared, statSnapshot);
          throw error;
        }
      });
      shared.queue = run.catch(() => undefined);
      return run;
    }),
  } as unknown as Database;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("renewal fulfillment", () => {
  it("extends an active invitation by 90 days and records the resulting grant", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
    const originalPaidAt = new Date("2026-08-01T00:00:00Z");
    const storedInvitation = invitation({ paidAt: originalPaidAt });
    const storedPayment = renewalPayment("payment-1", "NGRNW-active");
    const state = sharedState(storedInvitation);

    await expect(
      applyDokuResult(
        success("NGRNW-active"),
        { source: "webhook" },
        databaseFor(storedPayment, state),
      ),
    ).resolves.toMatchObject({
      status: "paid",
      transitioned: true,
      fulfilled: true,
    });

    const resultingExpiry = addDays(new Date("2026-10-01T00:00:00Z"), 90);
    expect(state.invitation).toMatchObject({
      status: "published",
      expiresAt: resultingExpiry,
      plan: "premium",
      hasWatermark: false,
      isEditLocked: false,
      editExpiresAt: null,
      paidAt: originalPaidAt,
    });
    expect(storedPayment.grantUntil).toEqual(resultingExpiry);
    expect(state.invitationLocks).toBe(1);
  });

  it("extends from fulfillment time and republishes an expired invitation", async () => {
    vi.useFakeTimers();
    const fulfilledAt = new Date("2026-09-23T12:00:00Z");
    vi.setSystemTime(fulfilledAt);
    const storedInvitation = invitation({
      status: "expired",
      expiresAt: new Date("2026-09-01T00:00:00Z"),
    });
    const storedPayment = renewalPayment("payment-2", "NGRNW-expired");
    const state = sharedState(storedInvitation);

    await applyDokuResult(
      success("NGRNW-expired"),
      { source: "status_query" },
      databaseFor(storedPayment, state),
    );

    const resultingExpiry = addDays(fulfilledAt, 90);
    expect(state.invitation).toMatchObject({
      status: "published",
      expiresAt: resultingExpiry,
    });
    expect(storedPayment.grantUntil).toEqual(resultingExpiry);
  });

  it("extends a null expiry from fulfillment time", async () => {
    vi.useFakeTimers();
    const fulfilledAt = new Date("2026-09-23T12:00:00Z");
    vi.setSystemTime(fulfilledAt);
    const storedPayment = renewalPayment("payment-null", "NGRNW-null");
    const state = sharedState(invitation({ expiresAt: null }));

    await applyDokuResult(
      success("NGRNW-null"),
      { source: "webhook" },
      databaseFor(storedPayment, state),
    );

    expect(state.invitation?.expiresAt).toEqual(addDays(fulfilledAt, 90));
    expect(storedPayment.grantUntil).toEqual(addDays(fulfilledAt, 90));
  });

  it.each(["draft", "archived"] as const)(
    "preserves %s publication state",
    async (status) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
      const storedInvitation = invitation({ status });
      const storedPayment = renewalPayment(
        `payment-${status}`,
        `NGRNW-${status}`,
      );
      const state = sharedState(storedInvitation);

      await applyDokuResult(
        success(`NGRNW-${status}`),
        { source: "webhook" },
        databaseFor(storedPayment, state),
      );

      expect(state.invitation?.status).toBe(status);
    },
  );

  it("makes duplicate webhook and callback SUCCESS delivery a no-op", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
    const initialExpiry = new Date("2026-10-01T00:00:00Z");
    const storedInvitation = invitation({ expiresAt: initialExpiry });
    const storedPayment = renewalPayment("payment-3", "NGRNW-duplicate");
    const state = sharedState(storedInvitation);
    const database = databaseFor(storedPayment, state);

    const [webhook, callback] = await Promise.all([
      applyDokuResult(
        success("NGRNW-duplicate"),
        { source: "webhook" },
        database,
      ),
      applyDokuResult(
        success("NGRNW-duplicate"),
        { source: "status_query" },
        database,
      ),
    ]);

    expect(webhook).toMatchObject({ fulfilled: true });
    expect(callback).toMatchObject({ fulfilled: false, transitioned: false });
    expect(state.invitation?.expiresAt).toEqual(addDays(initialExpiry, 90));
    expect(state.invitationUpdates).toBe(1);
  });

  it("stacks two distinct valid renewal payments to 180 days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
    const initialExpiry = new Date("2026-10-01T00:00:00Z");
    const state = sharedState(invitation({ expiresAt: initialExpiry }));
    const first = renewalPayment("payment-4", "NGRNW-first", {
      planTier: "premium",
    });
    const second = renewalPayment("payment-5", "NGRNW-second", {
      planTier: "premium",
    });

    const [firstResult, secondResult] = await Promise.all([
      applyDokuResult(
        success("NGRNW-first"),
        { source: "webhook" },
        databaseFor(first, state),
      ),
      applyDokuResult(
        success("NGRNW-second"),
        { source: "reconciliation" },
        databaseFor(second, state),
      ),
    ]);

    expect(firstResult.fulfilled).toBe(true);
    expect(secondResult.fulfilled).toBe(true);
    expect(first.grantUntil).toEqual(addDays(initialExpiry, 90));
    expect(second.grantUntil).toEqual(addDays(initialExpiry, 180));
    expect(state.invitation?.expiresAt).toEqual(addDays(initialExpiry, 180));
    expect(state.invitationLocks).toBe(2);
  });

  it("rolls back payment and invitation changes before a successful retry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
    const initialExpiry = new Date("2026-10-01T00:00:00Z");
    const storedPayment = renewalPayment("payment-6", "NGRNW-retry");
    const state = sharedState(invitation({ expiresAt: initialExpiry }), {
      failGrantUpdateOnce: true,
    });
    const database = databaseFor(storedPayment, state);

    await expect(
      applyDokuResult(success("NGRNW-retry"), { source: "webhook" }, database),
    ).rejects.toThrow("forced grant update failure");
    expect(storedPayment.status).toBe("pending");
    expect(storedPayment.grantUntil).toBeNull();
    expect(state.invitation?.expiresAt).toEqual(initialExpiry);

    await expect(
      applyDokuResult(success("NGRNW-retry"), { source: "webhook" }, database),
    ).resolves.toMatchObject({ status: "paid", fulfilled: true });
    expect(state.invitation?.expiresAt).toEqual(addDays(initialExpiry, 90));
  });

  it("fails closed when the linked invitation is missing", async () => {
    const storedPayment = renewalPayment("payment-7", "NGRNW-missing");
    const state = sharedState(null);

    await expect(
      applyDokuResult(
        success("NGRNW-missing"),
        { source: "webhook" },
        databaseFor(storedPayment, state),
      ),
    ).rejects.toThrow("renewal_entitlement_target_missing");
    expect(storedPayment.status).toBe("pending");
    expect(storedPayment.grantUntil).toBeNull();
  });

  it("does not fulfill a renewal that was refunded before fulfillment", async () => {
    const initialExpiry = new Date("2026-10-01T00:00:00Z");
    const storedPayment = renewalPayment("payment-8", "NGRNW-refunded", {
      status: "refunded",
      refundRecordedAt: new Date("2026-09-23T00:00:00Z"),
    });
    const state = sharedState(invitation({ expiresAt: initialExpiry }));

    await expect(
      applyDokuResult(
        success("NGRNW-refunded"),
        { source: "status_query" },
        databaseFor(storedPayment, state),
      ),
    ).resolves.toMatchObject({ status: "refunded", fulfilled: false });
    expect(state.invitation?.expiresAt).toEqual(initialExpiry);
    expect(storedPayment.grantUntil).toBeNull();
  });

  it("keeps a fulfilled extension after a financial-only refund", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
    const initialExpiry = new Date("2026-10-01T00:00:00Z");
    const storedPayment = renewalPayment("payment-9", "NGRNW-post-refund");
    const state = sharedState(invitation({ expiresAt: initialExpiry }));
    const database = databaseFor(storedPayment, state);

    await applyDokuResult(
      success("NGRNW-post-refund"),
      { source: "webhook" },
      database,
    );
    const resultingExpiry = addDays(initialExpiry, 90);
    await expect(
      applyDokuResult(
        fullRefund("NGRNW-post-refund"),
        { source: "webhook" },
        database,
      ),
    ).resolves.toMatchObject({ status: "refunded", fulfilled: false });

    expect(state.invitation?.expiresAt).toEqual(resultingExpiry);
    expect(storedPayment.grantUntil).toEqual(resultingExpiry);
  });
});
