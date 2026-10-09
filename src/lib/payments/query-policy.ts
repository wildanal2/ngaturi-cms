import { and, eq, isNull, or, sql } from "drizzle-orm";
import { payments } from "@/lib/db/schema";

/** Pending, legacy local expirations, and disputed terminal attempts remain unresolved. */
export function unresolvedPaymentCondition() {
  return or(
    eq(payments.status, "pending"),
    and(
      eq(payments.status, "expired"),
      isNull(payments.paidAt),
      or(
        isNull(payments.rawWebhook),
        sql`${payments.rawWebhook}->'processing'->>'legacyExpirationRecovery' = 'true'`,
      ),
    ),
    and(
      or(eq(payments.status, "expired"), eq(payments.status, "failed")),
      sql`${payments.rawWebhook}->'processing'->>'reviewRequired' = 'true'`,
    ),
  );
}
