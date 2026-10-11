import { describe, expect, it } from "vitest";
import { exactMoney, integerIdr, moneyMatches } from "./money";

describe("exact payment money", () => {
  it("compares database decimals and provider integer IDR exactly", () => {
    expect(moneyMatches("49000.00", "49000")).toBe(true);
    expect(moneyMatches("49000.00", "49000.01")).toBe(false);
    expect(exactMoney("99999999.99")).toBe("99999999.99");
    expect(integerIdr("99000.00")).toBe(99_000);
  });
  it.each([
    0,
    -1,
    NaN,
    Infinity,
    49_000.01,
    "1e3",
    "0",
    "-1",
    "100000000",
    "1.001",
    " 49000",
    null,
  ])("rejects malformed or inexact input %s", (value) => {
    expect(() => exactMoney(value)).toThrow("invalid_money");
  });
  it("never rounds fractional IDR at the API boundary", () => {
    expect(() => integerIdr("49000.01")).toThrow("fractional_idr_unsupported");
  });
});
