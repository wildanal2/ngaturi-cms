import { eq, sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { PAID_PACKAGE_QUOTA_BONUS } from "@/lib/invitation/entitlement";
import { RENEWAL_DAYS } from "./plans";
import { mapStatus, type DokuPaymentResult, type DokuStatus } from "./doku";
import {
  clearRefundReconciliationRequirement,
  recordFullRefundEvidence,
  recordRefundReviewEvidence,
  refundReconciliationRequired,
  refundReviewRequired,
} from "./refund-review";

export type PaymentResultStatus =
  "paid" | "expired" | "failed" | "pending" | "refunded";

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
  reviewRequired: boolean;
}

interface ApplyMetadata {
  requestId?: string | null;
  source:
    | "webhook"
    | "status_query"
    | "reconciliation"
    | "refund_reconciliation"
    | "operator_reconciliation";
}

function refundEvidence(
  result: DokuPaymentResult,
  paymentAmount: number,
  metadata: ApplyMetadata,
  receivedAt: Date,
) {
  const refundAmount = result.refund?.amount;
  const evidence =
    refundAmount === paymentAmount
      ? "full"
      : refundAmount !== undefined && refundAmount < paymentAmount
        ? "partial"
        : "ambiguous";

  return {
    evidence,
    reviewRequired: evidence !== "full",
    source: metadata.source,
    requestId: metadata.requestId ?? undefined,
    receivedAt: receivedAt.toISOString(),
    providerStatus: result.status,
    invoiceNumber: result.invoiceNumber,
    orderAmount: result.amount,
    refundAmount,
    refundId: result.refund?.id,
    currency: result.currency,
  };
}

/**
 * Atomically record a trusted DOKU result and apply its entitlement once.
 * The payment row lock serializes webhook retries, the browser status query,
 * and scheduled reconciliation.
 */
export async function applyDokuResult(
  result: DokuPaymentResult,
  metadata: ApplyMetadata,
  database: Database = db,
): Promise<AppliedPaymentResult> {
  return database.transaction(async (tx) => {
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
    if (
      (result.status !== "REFUNDED" && result.amount === undefined) ||
      (result.amount !== undefined && Number(pay.amount) !== result.amount)
    ) {
      throw new PaymentResultError("amount_mismatch");
    }
    if (result.currency && result.currency !== pay.currency) {
      throw new PaymentResultError("currency_mismatch");
    }

    if (pay.status === "refunded") {
      return {
        paymentId: pay.id,
        status: "refunded",
        transitioned: false,
        fulfilled: false,
        reviewRequired: refundReviewRequired(pay.refundMetadata),
      };
    }

    let effectiveRefundMetadata = pay.refundMetadata;
    if (refundReconciliationRequired(effectiveRefundMetadata)) {
      if (metadata.source !== "operator_reconciliation") {
        return {
          paymentId: pay.id,
          status: pay.status,
          transitioned: false,
          fulfilled: false,
          reviewRequired: true,
        };
      }
      effectiveRefundMetadata = clearRefundReconciliationRequirement(
        effectiveRefundMetadata,
      );
      await tx
        .update(payments)
        .set({ refundMetadata: effectiveRefundMetadata })
        .where(eq(payments.id, pay.id));
    }

    const nextStatus = mapStatus(result.status);
    const now = new Date();

    if (nextStatus === "refunded") {
      const previousStatus = pay.status;
      const evidence = refundEvidence(
        result,
        Number(pay.amount),
        metadata,
        now,
      );

      if (evidence.evidence !== "full") {
        const review = recordRefundReviewEvidence(
          effectiveRefundMetadata,
          evidence,
        );
        if (review.changed) {
          await tx
            .update(payments)
            .set({ refundMetadata: review.metadata })
            .where(eq(payments.id, pay.id));
        }
        return {
          paymentId: pay.id,
          status: previousStatus,
          transitioned: false,
          fulfilled: false,
          reviewRequired: review.reviewRequired,
        };
      }

      let entitlementReviewRequired =
        previousStatus !== "paid" && pay.paidAt !== null;
      if (
        previousStatus !== "paid" &&
        pay.kind === "invitation_unlock" &&
        pay.invitationId
      ) {
        const [invitation] = await tx
          .select({ isPaid: invitations.isPaid })
          .from(invitations)
          .where(eq(invitations.id, pay.invitationId))
          .limit(1);
        entitlementReviewRequired ||= invitation?.isPaid === true;
      }

      const recordedEvidence = recordFullRefundEvidence(
        effectiveRefundMetadata,
        evidence,
        entitlementReviewRequired,
      );

      await tx
        .update(payments)
        .set({
          status: "refunded",
          refundRecordedAt: now,
          refundMetadata: recordedEvidence,
        })
        .where(eq(payments.id, pay.id));
      return {
        paymentId: pay.id,
        status: "refunded",
        transitioned: true,
        fulfilled: false,
        reviewRequired: entitlementReviewRequired,
      };
    }

    if (refundReviewRequired(effectiveRefundMetadata)) {
      return {
        paymentId: pay.id,
        status: pay.status,
        transitioned: false,
        fulfilled: false,
        reviewRequired: true,
      };
    }

    if (pay.status === "paid") {
      return {
        paymentId: pay.id,
        status: "paid",
        transitioned: false,
        fulfilled: false,
        reviewRequired: false,
      };
    }

    if (pay.status === "expired" || pay.status === "failed") {
      return {
        paymentId: pay.id,
        status: pay.status,
        transitioned: false,
        fulfilled: false,
        reviewRequired: false,
      };
    }

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
        reviewRequired: false,
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
    } else if (pay.kind === "invitation_renewal") {
      if (!pay.invitationId) {
        throw new Error("renewal_entitlement_target_missing");
      }
      const [inv] = await tx
        .select({
          expiresAt: invitations.expiresAt,
          status: invitations.status,
        })
        .from(invitations)
        .where(eq(invitations.id, pay.invitationId))
        .limit(1)
        .for("update");
      if (!inv) {
        throw new Error("renewal_entitlement_target_missing");
      }
      const base = inv.expiresAt && inv.expiresAt > now ? inv.expiresAt : now;
      const resultingExpiry = new Date(
        base.getTime() + RENEWAL_DAYS * 86_400_000,
      );
      const [renewed] = await tx
        .update(invitations)
        .set({
          status: inv.status === "expired" ? "published" : inv.status,
          expiresAt: resultingExpiry,
          updatedAt: now,
        })
        .where(eq(invitations.id, pay.invitationId))
        .returning({ expiresAt: invitations.expiresAt });
      if (!renewed) {
        throw new Error("renewal_entitlement_target_missing");
      }
      await tx
        .update(payments)
        .set({ grantUntil: renewed.expiresAt })
        .where(eq(payments.id, pay.id));
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
      reviewRequired: false,
    };
  });
}

export function dokuResult(
  invoiceNumber: string,
  amount: number | undefined,
  status: DokuStatus,
  currency?: string,
  refund?: DokuPaymentResult["refund"],
): DokuPaymentResult {
  return { invoiceNumber, amount, currency, status, refund };
}

export async function invitationIdForInvoice(
  invoiceNumber: string,
  database: Database = db,
): Promise<string | null> {
  const [pay] = await database
    .select({ invitationId: payments.invitationId })
    .from(payments)
    .where(eq(payments.providerOrderId, invoiceNumber))
    .limit(1);
  return pay?.invitationId ?? null;
}
