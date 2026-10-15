import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";
import {
  PaymentProviderError,
  type PaymentObservation,
  type PaymentProvider,
} from "./provider";
import { PaymentResultError } from "./grant";
import { SumopodProvider, SUMOPOD_LIVE_BASE_URL } from "./sumopod";
import {
  reconcilePayments,
  recordReconciliationAttempt,
  RECONCILIATION_BATCH_SIZE,
  type ReconciliationCandidate,
} from "./reconcile";

function candidate(
  index: number,
  provider: "doku" | "sumopod" = "doku",
): ReconciliationCandidate {
  return {
    id: `payment-${index}`,
    provider,
    providerOrderId: `NGUNL-${index}`,
    providerPaymentId: null,
    createdAt: new Date("2020-01-01"),
    status: "pending",
    paidAt: null,
    rawWebhook: null,
  };
}
function observation(
  reference: string,
  provider: "doku" | "sumopod" = "doku",
  status: "paid" | "pending" = "paid",
): PaymentObservation {
  return {
    provider,
    merchantReference: reference,
    amount: "49000.00",
    currency: "IDR",
    status,
    providerStatus: status,
  };
}
function applied(result: PaymentObservation) {
  return {
    paymentId: result.merchantReference,
    status: result.status,
    transitioned: result.status === "paid",
    fulfilled: result.status === "paid",
    reviewRequired: false,
  };
}
function resolver(
  getPaymentStatus: PaymentProvider["getPaymentStatus"],
  name: "doku" | "sumopod" = "doku",
) {
  return {
    name,
    getPaymentStatus,
    supportsStatusReconciliation: name === "doku",
  } as PaymentProvider;
}
const recordAttempt = vi.fn().mockResolvedValue(undefined);

describe("mixed-provider reconciliation", () => {
  it("leaves aged LIVE Sumopod pending and reviewable without querying or inferring expiration", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi.spyOn(globalThis, "fetch");
    const applyResult = vi.fn();
    const record = vi.fn().mockResolvedValue(undefined);
    const provider = new SumopodProvider({
      baseUrl: SUMOPOD_LIVE_BASE_URL,
      liveEnabled: true,
      apiKey: "test-live",
      webhookToken: "test-token",
    });
    const lookup = vi.spyOn(provider, "getPaymentStatus");
    try {
      const summary = await reconcilePayments({
        loadCandidates: async () => [candidate(1, "sumopod")],
        resolveProvider: () => provider,
        applyResult,
        recordAttempt: record,
      });
      expect(summary).toMatchObject({
        aged: 1,
        checked: 0,
        transitioned: 0,
        fulfilled: 0,
        reviewRequired: 1,
        skipped: 1,
        unsupportedProvider: 1,
        errors: 0,
      });
      expect(applyResult).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(lookup).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
      warning.mockRestore();
    }
  });
  it("keeps an initial delay, bounded batch, and no maximum age cutoff", async () => {
    const now = new Date("2026-09-22T12:00:00Z");
    const database = {} as Database;
    const loadCandidates = vi.fn().mockResolvedValue([]);
    expect(
      await reconcilePayments({ now, database, loadCandidates, recordAttempt }),
    ).toMatchObject({ selected: 0, checked: 0, errors: 0, truncated: false });
    expect(loadCandidates).toHaveBeenCalledWith(
      { newestCreatedAt: new Date("2026-09-22T11:58:00Z"), limit: 51 },
      database,
    );
  });
  it("selects each adapter by stored provider in a mixed historical batch", async () => {
    const database = {} as Database;
    const doku = vi.fn(async ({ providerOrderId }) =>
      observation(providerOrderId),
    );
    const sumopod = vi.fn(async ({ providerOrderId }) =>
      observation(providerOrderId, "sumopod", "pending"),
    );
    const resolveProvider = vi.fn((name) =>
      resolver(name === "doku" ? doku : sumopod, name),
    );
    const applyResult = vi.fn(async (result: PaymentObservation) =>
      applied(result),
    );
    const summary = await reconcilePayments({
      database,
      loadCandidates: async () => [candidate(1), candidate(2, "sumopod")],
      resolveProvider,
      applyResult,
      recordAttempt,
    });
    expect(resolveProvider.mock.calls).toEqual([["doku"], ["sumopod"]]);
    expect(doku).toHaveBeenCalledWith({
      providerOrderId: "NGUNL-1",
      providerPaymentId: null,
    });
    expect(sumopod).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      checked: 1,
      skipped: 1,
      unsupportedProvider: 1,
      fulfilled: 1,
      aged: 2,
      errors: 0,
    });
    expect(applyResult).toHaveBeenCalledWith(
      expect.anything(),
      { source: "reconciliation", paymentId: "payment-1" },
      database,
    );
  });
  it("keeps timeout unresolved and continues other rows", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const check = vi.fn(async ({ providerOrderId }) => {
      if (providerOrderId.endsWith("2")) throw new Error("timeout");
      return observation(providerOrderId);
    });
    const applyResult = vi.fn(async (result: PaymentObservation) =>
      applied(result),
    );
    const record = vi.fn().mockResolvedValue(undefined);
    const summary = await reconcilePayments({
      loadCandidates: async () => [candidate(1), candidate(2), candidate(3)],
      resolveProvider: () => resolver(check),
      applyResult,
      recordAttempt: record,
    });
    expect(summary).toMatchObject({ checked: 2, fulfilled: 2, errors: 1 });
    expect(applyResult).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ id: "payment-2" }),
      expect.any(Date),
      "provider_or_processing_error",
      expect.anything(),
      true,
    );
    warning.mockRestore();
  });
  it.each([false, undefined])(
    "requires explicit status capability (%s)",
    async (capability) => {
      const lookup = vi.fn();
      const record = vi.fn();
      const provider = resolver(lookup);
      Object.assign(provider, { supportsStatusReconciliation: capability });
      const summary = await reconcilePayments({
        loadCandidates: async () => [candidate(1)],
        resolveProvider: () => provider,
        recordAttempt: record,
      });
      expect(summary).toMatchObject({
        skipped: 1,
        unsupportedProvider: 1,
        errors: 0,
      });
      expect(lookup).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    },
  );
  it.each([
    new PaymentProviderError("sumopod_status_contract_missing", "unavailable"),
    new PaymentProviderError("unsupported_payment_provider", "unavailable"),
    new PaymentProviderError("payment_not_configured", "unavailable"),
    new PaymentProviderError("permanent_provider_rejection", "rejected"),
    new PaymentResultError("amount_mismatch"),
  ])("records permanent %s once and never retries it", async (error) => {
    const pending = candidate(1);
    const lookup = vi.fn().mockRejectedValue(error);
    const applyResult = vi.fn();
    const record = vi.fn<typeof recordReconciliationAttempt>(
      async (_candidate, attemptedAt, category, _database, retryable) => {
        pending.rawWebhook = {
          reconciliation: {
            attemptedAt: attemptedAt.toISOString(),
            category,
            retryable,
          },
        };
      },
    );
    const dependencies = {
      loadCandidates: async () => [pending],
      resolveProvider: () => resolver(lookup),
      recordAttempt: record,
      applyResult,
    };
    expect(await reconcilePayments(dependencies)).toMatchObject({
      errors: 0,
      permanentFailures: 1,
      reviewRequired: 1,
    });
    const metadata = structuredClone(pending.rawWebhook);
    expect(await reconcilePayments(dependencies)).toMatchObject({
      errors: 0,
      skipped: 1,
      checked: 0,
    });
    expect(lookup).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledOnce();
    expect(applyResult).not.toHaveBeenCalled();
    expect(pending.status).toBe("pending");
    expect(pending.rawWebhook).toEqual(metadata);
  });
  it("skips legacy permanent metadata and missing references without mutation", async () => {
    const legacy = candidate(1);
    legacy.rawWebhook = {
      reconciliation: {
        category: "sumopod_status_contract_missing",
        attemptedAt: "2020-01-01",
      },
    };
    const missing = { ...candidate(2), providerOrderId: null };
    const lookup = vi.fn();
    const record = vi.fn();
    expect(
      await reconcilePayments({
        loadCandidates: async () => [legacy, missing],
        resolveProvider: () => resolver(lookup),
        recordAttempt: record,
      }),
    ).toMatchObject({ skipped: 2, missingReference: 1, errors: 0 });
    expect(lookup).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
  it("keeps transient provider failures eligible for the next invocation", async () => {
    const pending = candidate(1);
    const lookup = vi
      .fn()
      .mockRejectedValue(new PaymentProviderError("provider_timeout"));
    const record = vi.fn<typeof recordReconciliationAttempt>(
      async (_candidate, attemptedAt, category, _database, retryable) => {
        pending.rawWebhook = {
          reconciliation: {
            attemptedAt: attemptedAt.toISOString(),
            category,
            retryable,
          },
        };
      },
    );
    const dependencies = {
      loadCandidates: async () => [pending],
      resolveProvider: () => resolver(lookup),
      recordAttempt: record,
    };
    expect(await reconcilePayments(dependencies)).toMatchObject({
      errors: 1,
      permanentFailures: 0,
    });
    expect(await reconcilePayments(dependencies)).toMatchObject({
      errors: 1,
      permanentFailures: 0,
    });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledTimes(2);
    expect(pending.status).toBe("pending");
    expect(pending.rawWebhook).toMatchObject({
      reconciliation: { retryable: true },
    });
  });
  it("stops automatic attempts after an authoritative result requires review", async () => {
    const pending = candidate(1);
    const lookup = vi
      .fn()
      .mockResolvedValue(observation("NGUNL-1", "doku", "pending"));
    const record = vi.fn<typeof recordReconciliationAttempt>(
      async (_candidate, attemptedAt, category, _database, retryable) => {
        pending.rawWebhook = {
          reconciliation: {
            attemptedAt: attemptedAt.toISOString(),
            category,
            retryable,
          },
        };
      },
    );
    const dependencies = {
      loadCandidates: async () => [pending],
      resolveProvider: () => resolver(lookup),
      recordAttempt: record,
      applyResult: vi.fn(async (result: PaymentObservation) => ({
        ...applied(result),
        reviewRequired: true,
      })),
    };
    expect(await reconcilePayments(dependencies)).toMatchObject({
      checked: 1,
      reviewRequired: 1,
      errors: 0,
    });
    expect(await reconcilePayments(dependencies)).toMatchObject({
      skipped: 1,
      checked: 0,
      errors: 0,
    });
    expect(lookup).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledOnce();
  });
  it("caps each cycle at fifty rows", async () => {
    const check = vi.fn(async ({ providerOrderId }) =>
      observation(providerOrderId, "doku", "pending"),
    );
    const summary = await reconcilePayments({
      loadCandidates: async () =>
        Array.from({ length: 51 }, (_, i) => candidate(i)),
      resolveProvider: () => resolver(check),
      applyResult: async (result) => applied(result),
      recordAttempt,
    });
    expect(summary).toMatchObject({
      selected: RECONCILIATION_BATCH_SIZE,
      checked: 50,
      truncated: true,
    });
    expect(check).toHaveBeenCalledTimes(50);
  });
  it("never runs more than five provider requests concurrently", async () => {
    let active = 0;
    let maximum = 0;
    const releases: Array<() => void> = [];
    const check = vi.fn(async ({ providerOrderId }) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active--;
      return observation(providerOrderId);
    });
    const reconciliation = reconcilePayments({
      loadCandidates: async () =>
        Array.from({ length: 10 }, (_, i) => candidate(i)),
      resolveProvider: () => resolver(check),
      applyResult: async (result) => applied(result),
      recordAttempt,
    });
    await vi.waitFor(() => expect(check).toHaveBeenCalledTimes(5));
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(check).toHaveBeenCalledTimes(10));
    releases.splice(0).forEach((release) => release());
    expect((await reconciliation).checked).toBe(10);
    expect(maximum).toBe(5);
  });
});
