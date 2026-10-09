import { eq, sql } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { PAID_PACKAGE_QUOTA_BONUS } from "@/lib/invitation/entitlement";
import { RENEWAL_DAYS } from "./plans";
import { integerIdr, moneyMatches, moneyMinorUnits } from "./money";
import { resolvePaymentProvider } from "./registry";
import type { PaymentObservation, PaymentResultStatus } from "./provider";
import {
  asRecord,
  paymentReviewRequired,
  isLegacyLocalExpiration,
} from "./processing-metadata";
import {
  clearRefundReconciliationRequirement,
  recordFullRefundEvidence,
  recordRefundReviewEvidence,
  refundReconciliationRequired,
  refundReviewRequired,
} from "./refund-review";

export type { PaymentResultStatus } from "./provider";

export class PaymentResultError extends Error {
  constructor(
    public readonly code:
      | "unknown_payment"
      | "wrong_provider"
      | "amount_mismatch"
      | "currency_mismatch"
      | "merchant_reference_mismatch"
      | "provider_payment_id_mismatch"
      | "unsupported_refund",
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

export interface ApplyMetadata {
  paymentId?: string;
  requestId?: string | null;
  source:
    | "webhook"
    | "status_query"
    | "reconciliation"
    | "refund_reconciliation"
    | "operator_reconciliation";
}

// Preserve historical integer-IDR refund audit keys; comparisons still use exact decimal units.
function refundAuditAmount(
  value: string | undefined,
): string | number | undefined {
  if (value === undefined) return undefined;
  try {
    return integerIdr(value);
  } catch {
    return value;
  }
}

function refundEvidence(
  result: PaymentObservation,
  paymentAmount: string,
  metadata: ApplyMetadata,
  receivedAt: Date,
) {
  const refundAmount = result.refund?.amount;
  const evidence =
    refundAmount !== undefined && moneyMatches(refundAmount, paymentAmount)
      ? "full"
      : refundAmount !== undefined &&
          moneyMinorUnits(refundAmount) < moneyMinorUnits(paymentAmount)
        ? "partial"
        : "ambiguous";

  return {
    evidence,
    reviewRequired: evidence !== "full",
    source: metadata.source,
    requestId: metadata.requestId ?? undefined,
    receivedAt: receivedAt.toISOString(),
    providerStatus: result.providerStatus,
    invoiceNumber: result.merchantReference,
    orderAmount: refundAuditAmount(result.amount),
    refundAmount: refundAuditAmount(refundAmount),
    refundId: result.refund?.id,
    currency: result.currency,
  };
}

/**
 * Atomically record a trusted provider observation and apply its entitlement once.
 * The payment row lock serializes webhook retries, the browser status query,
 * and scheduled reconciliation.
 */
export async function applyPaymentObservation(
  result: PaymentObservation,
  metadata: ApplyMetadata,
  database: Database = db,
): Promise<AppliedPaymentResult> {
  return database.transaction(async (tx) => {
    const [pay] = await tx
      .select()
      .from(payments)
      .where(
        metadata.paymentId
          ? eq(payments.id, metadata.paymentId)
          : eq(payments.providerOrderId, result.merchantReference),
      )
      .limit(1)
      .for("update");

    if (!pay) throw new PaymentResultError("unknown_payment");
    if (pay.provider !== result.provider) {
      throw new PaymentResultError("wrong_provider");
    }
    if (pay.providerOrderId !== result.merchantReference) {
      throw new PaymentResultError("merchant_reference_mismatch");
    }
    if (
      result.providerPaymentId &&
      pay.providerPaymentId &&
      result.providerPaymentId !== pay.providerPaymentId
    ) {
      throw new PaymentResultError("provider_payment_id_mismatch");
    }
    if (
      result.status === "refunded" &&
      !resolvePaymentProvider(result.provider).supportsRefundEvidence
    ) {
      throw new PaymentResultError("unsupported_refund");
    }
    if (
      (result.status !== "refunded" && result.amount === undefined) ||
      (result.amount !== undefined && !moneyMatches(pay.amount, result.amount))
    ) {
      throw new PaymentResultError("amount_mismatch");
    }
    if (result.currency !== pay.currency) {
      throw new PaymentResultError("currency_mismatch");
    }

    if (result.providerPaymentId && !pay.providerPaymentId) {
      await tx
        .update(payments)
        .set({ providerPaymentId: result.providerPaymentId })
        .where(eq(payments.id, pay.id));
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

    const nextStatus = result.status;
    const now = new Date();

    if (nextStatus === "refunded") {
      const previousStatus = pay.status;
      const evidence = refundEvidence(result, pay.amount, metadata, now);

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

    const legacyExpiration = isLegacyLocalExpiration(pay);
    const previousAudit = asRecord(pay.rawWebhook);
    const previousProcessing = asRecord(previousAudit.processing);
    const review = async (category: string) => {
      await tx
        .update(payments)
        .set({
          rawWebhook: {
            ...previousAudit,
            processing: {
              ...previousProcessing,
              reviewRequired: true,
              category,
              conflictingObservation: {
                ...result,
                receivedAt: now.toISOString(),
                source: metadata.source,
              },
            },
          },
        })
        .where(eq(payments.id, pay.id));
      return {
        paymentId: pay.id,
        status: pay.status,
        transitioned: false,
        fulfilled: false,
        reviewRequired: true,
      };
    };

    if (pay.status === "paid") {
      if (nextStatus === "expired" || nextStatus === "failed")
        return review("contradictory_terminal_evidence");
      return {
        paymentId: pay.id,
        status: "paid",
        transitioned: false,
        fulfilled: false,
        reviewRequired: paymentReviewRequired(pay.rawWebhook),
      };
    }
    if (
      (pay.status === "expired" || pay.status === "failed") &&
      !legacyExpiration
    ) {
      if (
        nextStatus === "paid" ||
        (nextStatus !== "pending" && nextStatus !== pay.status)
      ) {
        return review("contradictory_terminal_evidence");
      }
      return {
        paymentId: pay.id,
        status: pay.status,
        transitioned: false,
        fulfilled: false,
        reviewRequired: paymentReviewRequired(pay.rawWebhook),
      };
    }

    const auditRecord = {
      ...previousAudit,
      provider: result.provider,
      observation: result,
      processing: { ...previousProcessing, legacyExpirationRecovery: false },
      source: metadata.source,
      requestId: metadata.requestId ?? undefined,
      receivedAt: now.toISOString(),
      order: {
        invoice_number: result.merchantReference,
        amount: result.amount,
        currency: result.currency ?? pay.currency,
      },
      transaction: { status: result.providerStatus },
    };

    const previousStatus = pay.status;
    await tx
      .update(payments)
      .set({
        status: nextStatus,
        rawWebhook: auditRecord,
        paidAt: nextStatus === "paid" ? (pay.paidAt ?? now) : pay.paidAt,
      })
      .where(eq(payments.id, pay.id));

    if (nextStatus !== "paid") {
      return {
        paymentId: pay.id,
        status: nextStatus,
        transitioned: nextStatus !== previousStatus,
        fulfilled: false,
        reviewRequired: paymentReviewRequired(auditRecord),
      };
    }

    if (pay.kind === "invitation_unlock") {
      if (!pay.invitationId)
        throw new Error("unlock_entitlement_target_missing");
      const [inv] = await tx
        .select({ isPaid: invitations.isPaid, plan: invitations.plan })
        .from(invitations)
        .where(eq(invitations.id, pay.invitationId))
        .limit(1)
        .for("update");
      if (!inv) throw new Error("unlock_entitlement_target_missing");
      if (inv.isPaid) {
        // Record both financial successes, but only the first unlock owns entitlement.
        await tx
          .update(payments)
          .set({
            rawWebhook: {
              ...auditRecord,
              processing: {
                ...auditRecord.processing,
                reviewRequired: true,
                category: "duplicate_successful_unlock",
                duplicateSuccessfulUnlock: true,
                retainedPlan: inv.plan,
              },
            },
          })
          .where(eq(payments.id, pay.id));
        return {
          paymentId: pay.id,
          status: "paid",
          transitioned: true,
          fulfilled: false,
          reviewRequired: true,
        };
      }
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
      reviewRequired: paymentReviewRequired(auditRecord),
    };
  });
}
