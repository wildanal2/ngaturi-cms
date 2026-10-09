export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function paymentReviewRequired(rawWebhook: unknown): boolean {
  return asRecord(asRecord(rawWebhook).processing).reviewRequired === true;
}

/** Old checkout code expired rows locally without recording provider evidence. */
export function isLegacyLocalExpiration(payment: {
  status: string;
  rawWebhook: unknown;
  paidAt: Date | null;
}): boolean {
  return (
    payment.status === "expired" &&
    payment.paidAt === null &&
    (payment.rawWebhook === null ||
      asRecord(asRecord(payment.rawWebhook).processing)
        .legacyExpirationRecovery === true)
  );
}
