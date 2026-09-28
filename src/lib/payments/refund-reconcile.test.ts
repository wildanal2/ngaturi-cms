import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";
import {
  reconcileDokuPaymentReference,
  reconcileDokuRefund,
} from "./refund-reconcile";

describe("reconcileDokuRefund", () => {
  it("does not apply a provider status that is not REFUNDED", async () => {
    const checkStatus = vi.fn().mockResolvedValue({
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      status: "SUCCESS",
    });

    await expect(
      reconcileDokuRefund("NGUNL-test", {} as Database, checkStatus),
    ).resolves.toEqual({ outcome: "not_refunded", providerStatus: "SUCCESS" });
  });

  it("routes a verified provider refund through the shared refund transaction", async () => {
    const database = {} as Database;
    const providerResult = {
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      status: "REFUNDED" as const,
      refund: { id: "refund-1", amount: 49_000 },
    };
    const checkStatus = vi.fn().mockResolvedValue(providerResult);
    const applyResult = vi.fn().mockResolvedValue({
      paymentId: "payment-1",
      status: "refunded",
      transitioned: true,
      fulfilled: false,
      reviewRequired: false,
    });

    await expect(
      reconcileDokuRefund("NGUNL-test", database, checkStatus, applyResult),
    ).resolves.toMatchObject({
      outcome: "processed",
      payment: { status: "refunded" },
    });
    expect(applyResult).toHaveBeenCalledWith(
      providerResult,
      { source: "refund_reconciliation" },
      database,
    );
  });
});

describe("reconcileDokuPaymentReference", () => {
  it("applies a fresh signed status through the shared payment transaction", async () => {
    const database = {} as Database;
    const providerResult = {
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      status: "SUCCESS" as const,
    };
    const checkStatus = vi.fn().mockResolvedValue(providerResult);
    const applyResult = vi.fn().mockResolvedValue({
      paymentId: "payment-1",
      status: "paid",
      transitioned: true,
      fulfilled: true,
      reviewRequired: false,
    });

    await expect(
      reconcileDokuPaymentReference(
        "NGUNL-test",
        database,
        checkStatus,
        applyResult,
      ),
    ).resolves.toMatchObject({ status: "paid", fulfilled: true });
    expect(applyResult).toHaveBeenCalledWith(
      providerResult,
      { source: "operator_reconciliation" },
      database,
    );
  });
});
