import { describe, expect, it, vi } from "vitest";
import type { DokuPaymentResult } from "./doku";
import type { AppliedPaymentResult } from "./grant";
import type { Database } from "@/lib/db";
import {
  DOKU_RECONCILIATION_BATCH_SIZE,
  reconcilePendingDokuPayments,
} from "./reconcile";

function candidate(index: number) {
  return {
    id: `payment-${index}`,
    providerOrderId: `NGUNL-${index}`,
  };
}

function result(
  invoiceNumber: string,
  status: DokuPaymentResult["status"] = "SUCCESS",
): DokuPaymentResult {
  return { invoiceNumber, amount: 49_000, currency: "IDR", status };
}

function applied(
  paymentId: string,
  status: AppliedPaymentResult["status"] = "paid",
): AppliedPaymentResult {
  return {
    paymentId,
    status,
    transitioned: status !== "pending",
    fulfilled: status === "paid",
  };
}

describe("reconcilePendingDokuPayments", () => {
  it("uses the bounded two-minute to 24-hour eligibility window", async () => {
    const now = new Date("2026-09-22T12:00:00.000Z");
    const database = {} as Database;
    const loadCandidates = vi.fn().mockResolvedValue([]);

    const summary = await reconcilePendingDokuPayments({
      now,
      database,
      loadCandidates,
    });

    expect(loadCandidates).toHaveBeenCalledWith(
      {
        oldestCreatedAt: new Date("2026-09-21T12:00:00.000Z"),
        newestCreatedAt: new Date("2026-09-22T11:58:00.000Z"),
        limit: DOKU_RECONCILIATION_BATCH_SIZE + 1,
      },
      database,
    );
    expect(summary).toEqual({
      selected: 0,
      checked: 0,
      transitioned: 0,
      fulfilled: 0,
      statuses: { paid: 0, expired: 0, failed: 0, pending: 0 },
      errors: 0,
      truncated: false,
    });
  });

  it("checks each candidate and reuses the reconciliation fulfillment path", async () => {
    const database = {} as Database;
    const candidates = [candidate(1), candidate(2)];
    const checkStatus = vi.fn(async (invoiceNumber: string) =>
      result(
        invoiceNumber,
        invoiceNumber.endsWith("1") ? "SUCCESS" : "PENDING",
      ),
    );
    const applyResult = vi.fn(
      async (
        paymentResult: DokuPaymentResult,
        metadata: { source: string },
        receivedDatabase: Database,
      ) => {
        expect(metadata).toEqual({ source: "reconciliation" });
        expect(receivedDatabase).toBe(database);
        return applied(
          paymentResult.invoiceNumber,
          paymentResult.status === "SUCCESS" ? "paid" : "pending",
        );
      },
    );

    const summary = await reconcilePendingDokuPayments({
      database,
      loadCandidates: async () => candidates,
      checkStatus,
      applyResult,
    });

    expect(checkStatus).toHaveBeenCalledTimes(2);
    expect(applyResult).toHaveBeenCalledTimes(2);
    expect(applyResult.mock.calls.every((call) => call[2] === database)).toBe(
      true,
    );
    expect(summary).toEqual({
      selected: 2,
      checked: 2,
      transitioned: 1,
      fulfilled: 1,
      statuses: { paid: 1, expired: 0, failed: 0, pending: 1 },
      errors: 0,
      truncated: false,
    });
  });

  it("isolates a rejected provider result and continues the batch", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const candidates = [candidate(1), candidate(2), candidate(3)];
    const checkStatus = vi.fn(async (invoiceNumber: string) => {
      if (invoiceNumber.endsWith("2")) {
        throw new Error("DOKU status response signature is invalid");
      }
      return result(invoiceNumber);
    });
    const applyResult = vi.fn(async (paymentResult: DokuPaymentResult) =>
      applied(paymentResult.invoiceNumber),
    );

    const summary = await reconcilePendingDokuPayments({
      loadCandidates: async () => candidates,
      checkStatus,
      applyResult,
    });

    expect(checkStatus).toHaveBeenCalledTimes(3);
    expect(applyResult).toHaveBeenCalledTimes(2);
    expect(summary.checked).toBe(2);
    expect(summary.fulfilled).toBe(2);
    expect(summary.errors).toBe(1);
    expect(warning).toHaveBeenCalledWith(
      "DOKU reconciliation candidate failed",
      JSON.stringify({
        paymentId: "payment-2",
        category: "provider_or_processing_error",
      }),
    );
    warning.mockRestore();
  });

  it("caps a run at 50 payments and reports truncation", async () => {
    const candidates = Array.from(
      { length: DOKU_RECONCILIATION_BATCH_SIZE + 1 },
      (_, index) => candidate(index),
    );
    const checkStatus = vi.fn(async (invoiceNumber: string) =>
      result(invoiceNumber, "PENDING"),
    );
    const applyResult = vi.fn(async (paymentResult: DokuPaymentResult) =>
      applied(paymentResult.invoiceNumber, "pending"),
    );

    const summary = await reconcilePendingDokuPayments({
      loadCandidates: async () => candidates,
      checkStatus,
      applyResult,
    });

    expect(summary.selected).toBe(DOKU_RECONCILIATION_BATCH_SIZE);
    expect(summary.checked).toBe(DOKU_RECONCILIATION_BATCH_SIZE);
    expect(summary.truncated).toBe(true);
    expect(checkStatus).toHaveBeenCalledTimes(DOKU_RECONCILIATION_BATCH_SIZE);
  });
});
