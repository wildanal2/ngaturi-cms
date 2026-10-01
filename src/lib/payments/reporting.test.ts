import { describe, expect, it } from "vitest";
import { summarizePaymentRevenue } from "./reporting";

describe("summarizePaymentRevenue", () => {
  it("excludes refunded payments from paid revenue and reports them separately", () => {
    expect(
      summarizePaymentRevenue([
        { status: "paid", amount: 49_000 },
        { status: "refunded", amount: 99_000 },
        { status: "failed", amount: 25_000 },
      ]),
    ).toEqual({
      paidRevenue: 49_000,
      refundedAmount: 99_000,
      renewalPaidAmount: 0,
      renewalPaidCount: 0,
      renewalByTier: {
        basic: { paidAmount: 0, paidCount: 0 },
        premium: { paidAmount: 0, paidCount: 0 },
        legacyUnknown: { paidAmount: 0, paidCount: 0 },
      },
    });
  });

  it("reports paid renewal amount, count, and captured invitation tier", () => {
    expect(
      summarizePaymentRevenue([
        {
          status: "paid",
          kind: "invitation_renewal",
          planTier: "basic",
          amount: 50_000,
          count: 2,
        },
        {
          status: "paid",
          kind: "invitation_renewal",
          planTier: "premium",
          amount: 25_000,
          count: 1,
        },
        {
          status: "refunded",
          kind: "invitation_renewal",
          planTier: "premium",
          amount: 25_000,
          count: 1,
        },
      ]),
    ).toMatchObject({
      paidRevenue: 75_000,
      refundedAmount: 25_000,
      renewalPaidAmount: 75_000,
      renewalPaidCount: 3,
      renewalByTier: {
        basic: { paidAmount: 50_000, paidCount: 2 },
        premium: { paidAmount: 25_000, paidCount: 1 },
        legacyUnknown: { paidAmount: 0, paidCount: 0 },
      },
    });
  });

  it("classifies legacy renewal planTier as legacy/unknown without guessing", () => {
    const summary = summarizePaymentRevenue([
      {
        status: "paid",
        kind: "invitation_renewal",
        planTier: "renewal",
        amount: 25_000,
      },
    ]);

    expect(summary.renewalByTier.legacyUnknown).toEqual({
      paidAmount: 25_000,
      paidCount: 1,
    });
  });
});
