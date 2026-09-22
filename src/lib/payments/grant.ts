import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { PAID_PACKAGE_QUOTA_BONUS } from "@/lib/invitation/entitlement";
import { RENEWAL_DAYS } from "./plans";
import { mapStatus, type DokuPaymentResult, type DokuStatus } from "./doku";

export type PaymentResultStatus = "paid" | "expired" | "failed" | "pending";

export class PaymentResultError extends Error {
  constructor(
    public readonly code:
      | "unknown_payment"
      | "wrong_provider"
      | "amount_mismatch"
      | "currency_mismatch",
  ) {
    super(code);
    this.name = "PaymentResultError";
  }
}

export interface AppliedPaymentResult {
  paymentId: string;
  status: PaymentResultStatus;
  transitioned: boolean;
  fulfilled: boolean;
}

interface ApplyMetadata {
  requestId?: string | null;
  source: "webhook" | "status_query" | "reconciliation";
}

/**
 * Atomically record a trusted DOKU result and apply its entitlement once.
 * The payment row lock serializes webhook retries, the browser status query,
 * and scheduled reconciliation.
 */
export async function applyDokuResult(
  result: DokuPaymentResult,
  metadata: ApplyMetadata,
): Promise<AppliedPaymentResult> {
  return db.transaction(async (tx) => {
    const [pay] = await tx
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, result.invoiceNumber))
      .limit(1)
      .for("update");

    if (!pay) throw new PaymentResultError("unknown_payment");
    if (pay.provider !== "doku") {
      throw new PaymentResultError("wrong_provider");
    }
    if (Number(pay.amount) !== result.amount) {
      throw new PaymentResultError("amount_mismatch");
    }
    if (result.currency && result.currency !== pay.currency) {
      throw new PaymentResultError("currency_mismatch");
    }

    if (pay.status === "paid") {
      return {
        paymentId: pay.id,
        status: "paid",
        transitioned: false,
        fulfilled: false,
      };
    }

    const nextStatus = mapStatus(result.status);
    if (pay.status === "expired" || pay.status === "failed") {
      return {
        paymentId: pay.id,
        status: pay.status,
        transitioned: false,
        fulfilled: false,
      };
    }

    const now = new Date();
    const auditRecord = {
      source: metadata.source,
      requestId: metadata.requestId ?? undefined,
      receivedAt: now.toISOString(),
      order: {
        invoice_number: result.invoiceNumber,
        amount: result.amount,
        currency: result.currency ?? pay.currency,
      },
      transaction: { status: result.status },
    };

    await tx
      .update(payments)
      .set({
        status: nextStatus,
        rawWebhook: auditRecord,
        paidAt: nextStatus === "paid" ? now : null,
      })
      .where(eq(payments.id, pay.id));

    if (nextStatus !== "paid") {
      return {
        paymentId: pay.id,
        status: nextStatus,
        transitioned: nextStatus !== pay.status,
        fulfilled: false,
      };
    }

    if (pay.kind === "invitation_unlock" && pay.invitationId) {
      await tx
        .update(invitations)
        .set({
          isPaid: true,
          plan: pay.planTier === "premium" ? "premium" : "basic",
          hasWatermark: false,
          isEditLocked: false,
          editExpiresAt: null,
          paidAt: now,
          updatedAt: now,
        })
        .where(eq(invitations.id, pay.invitationId));

      // Beli paket = +1 kuota untuk bikin undangan berikutnya.
      if (pay.userId) {
        await tx
          .insert(userProfiles)
          .values({
            userId: pay.userId,
            invitationQuotaBonus: PAID_PACKAGE_QUOTA_BONUS,
          })
          .onConflictDoUpdate({
            target: userProfiles.userId,
            set: {
              invitationQuotaBonus: sql`${userProfiles.invitationQuotaBonus} + ${PAID_PACKAGE_QUOTA_BONUS}`,
              updatedAt: now,
            },
          });
      }
    } else if (pay.kind === "invitation_renewal" && pay.invitationId) {
      const [inv] = await tx
        .select({ expiresAt: invitations.expiresAt })
        .from(invitations)
        .where(eq(invitations.id, pay.invitationId))
        .limit(1);
      const base = inv?.expiresAt && inv.expiresAt > now ? inv.expiresAt : now;
      await tx
        .update(invitations)
        .set({
          status: "published",
          expiresAt: new Date(base.getTime() + RENEWAL_DAYS * 86_400_000),
          updatedAt: now,
        })
        .where(eq(invitations.id, pay.invitationId));
    } else if (pay.kind === "business_subscription" && pay.userId) {
      await tx
        .update(userProfiles)
        .set({
          businessSubscriptionExpiresAt: new Date(
            now.getTime() + 30 * 86_400_000,
          ),
          updatedAt: now,
        })
        .where(eq(userProfiles.userId, pay.userId));
    }

    return {
      paymentId: pay.id,
      status: "paid",
      transitioned: true,
      fulfilled: true,
    };
  });
}

export function dokuResult(
  invoiceNumber: string,
  amount: number,
  status: DokuStatus,
  currency?: string,
): DokuPaymentResult {
  return { invoiceNumber, amount, currency, status };
}

export async function invitationIdForInvoice(
  invoiceNumber: string,
): Promise<string | null> {
  const [pay] = await db
    .select({ invitationId: payments.invitationId })
    .from(payments)
    .where(eq(payments.providerOrderId, invoiceNumber))
    .limit(1);
  return pay?.invitationId ?? null;
}
