import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";
import type { PaymentObservation, PaymentProvider } from "./provider";
import {
  reconcilePayments,
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
  return { name, getPaymentStatus } as PaymentProvider;
}
const recordAttempt = vi.fn().mockResolvedValue(undefined);

describe("mixed-provider reconciliation", () => {
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
    expect(sumopod).toHaveBeenCalledWith({
      providerOrderId: "NGUNL-2",
      providerPaymentId: null,
    });
    expect(summary).toMatchObject({
      checked: 2,
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
    );
    warning.mockRestore();
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
