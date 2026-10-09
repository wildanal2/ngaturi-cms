/** Decimal(10,2), parsed without floating-point arithmetic or rounding. */
export function moneyMinorUnits(value: unknown): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error("invalid_money");
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("invalid_money");
  }
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error("invalid_money");
  const units =
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (units <= BigInt(0)) throw new Error("invalid_money");
  return units;
}

export function exactMoney(value: unknown): string {
  const units = moneyMinorUnits(value);
  return `${units / BigInt(100)}.${(units % BigInt(100)).toString().padStart(2, "0")}`;
}

/** JSON APIs use a number for integer IDR; this conversion is exactly representable. */
export function integerIdr(value: unknown): number {
  const units = moneyMinorUnits(value);
  if (units % BigInt(100) !== BigInt(0))
    throw new Error("fractional_idr_unsupported");
  return Number(units / BigInt(100));
}

export function moneyMatches(a: unknown, b: unknown): boolean {
  try {
    return moneyMinorUnits(a) === moneyMinorUnits(b);
  } catch {
    return false;
  }
}
