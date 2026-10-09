import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";
import {
  reconcileDokuPaymentReference,
  reconcileDokuRefund,
} from "./refund-reconcile";

function localDatabase(provider: string | null = "doku") {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (provider ? [{ id: "payment-1", provider }] : []),
        }),
      }),
    }),
  } as unknown as Database;
}

describe("reconcileDokuRefund", () => {
  it("does not apply a provider status that is not REFUNDED", async () => {
    const checkStatus = vi.fn().mockResolvedValue({
      invoiceNumber: "NGUNL-test",
      amount: 49_000,
      status: "SUCCESS",
    });

    await expect(
      reconcileDokuRefund("NGUNL-test", localDatabase(), checkStatus),
    ).resolves.toEqual({ outcome: "not_refunded", providerStatus: "SUCCESS" });
  });

  it("routes a verified provider refund through the shared refund transaction", async () => {
    const database = localDatabase();
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
      { source: "refund_reconciliation", paymentId: "payment-1" },
      database,
    );
  });

  it.each([null, "sumopod"])(
    "rejects unsupported or unknown local payments before querying DOKU (%s)",
    async (provider) => {
      const checkStatus = vi.fn();
      await expect(
        reconcileDokuRefund("reference", localDatabase(provider), checkStatus),
      ).rejects.toMatchObject({
        code: provider ? "unsupported_refund" : "unknown_payment",
      });
      expect(checkStatus).not.toHaveBeenCalled();
    },
  );
});

describe("reconcileDokuPaymentReference", () => {
  it("applies a fresh signed status through the shared payment transaction", async () => {
    const database = localDatabase();
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
      { source: "operator_reconciliation", paymentId: "payment-1" },
      database,
    );
  });
});
