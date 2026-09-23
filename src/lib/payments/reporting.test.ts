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
    ).toEqual({ paidRevenue: 49_000, refundedAmount: 99_000 });
  });
});
