import { eq } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { invitations, payments } from "@/lib/db/schema";

export type RefundReviewDecision = "confirm" | "reject";

export class RefundReviewResolutionError extends Error {
  constructor(
    public readonly code:
      | "invalid_input"
      | "unknown_payment"
      | "wrong_provider"
      | "no_pending_review"
      | "review_already_resolved",
  ) {
    super(code);
    this.name = "RefundReviewResolutionError";
  }
}

interface RefundEvidenceRecord extends Record<string, unknown> {
  evidence: string;
  invoiceNumber: string;
}

interface ReviewResolutionRecord extends Record<string, unknown> {
  decision: RefundReviewDecision;
  evidenceKey: string;
  operator: string;
  reason: string;
  resolvedAt: string;
}

export interface RefundReviewResolutionResult {
  paymentId: string;
  status: (typeof payments.$inferSelect)["status"];
  decision: RefundReviewDecision;
  resolved: boolean;
  transitioned: boolean;
  reviewRequired: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function evidenceKey(evidence: Record<string, unknown>): string {
  return JSON.stringify([
    evidence.invoiceNumber ?? null,
    evidence.evidence ?? null,
    evidence.refundId ?? null,
    evidence.refundAmount ?? null,
  ]);
}

function currentEvidenceKey(metadata: Record<string, unknown>): string {
  return typeof metadata.currentEvidenceKey === "string"
    ? metadata.currentEvidenceKey
    : evidenceKey(metadata);
}

function currentResolution(
  metadata: Record<string, unknown>,
): ReviewResolutionRecord | null {
  const resolution = asRecord(metadata.resolution);
  return (resolution.decision === "confirm" ||
    resolution.decision === "reject") &&
    typeof resolution.evidenceKey === "string"
    ? (resolution as ReviewResolutionRecord)
    : null;
}

function evidenceHistoryEntry(metadata: Record<string, unknown>) {
  return {
    type: "refund_evidence",
    evidence: metadata.evidence,
    source: metadata.source,
    requestId: metadata.requestId,
    receivedAt: metadata.receivedAt,
    providerStatus: metadata.providerStatus,
    invoiceNumber: metadata.invoiceNumber,
    orderAmount: metadata.orderAmount,
    refundAmount: metadata.refundAmount,
    refundId: metadata.refundId,
    currency: metadata.currency,
    evidenceKey: currentEvidenceKey(metadata),
  };
}

function reviewHistory(metadata: Record<string, unknown>): unknown[] {
  if (Array.isArray(metadata.reviewHistory)) return metadata.reviewHistory;
  return typeof metadata.evidence === "string"
    ? [evidenceHistoryEntry(metadata)]
    : [];
}

export function refundReviewRequired(metadata: unknown): boolean {
  const record = asRecord(metadata);
  return (
    record.reviewRequired === true ||
    record.entitlementReviewRequired === true ||
    record.reconciliationRequired === true
  );
}

export function refundReconciliationRequired(metadata: unknown): boolean {
  return asRecord(metadata).reconciliationRequired === true;
}

export function clearRefundReconciliationRequirement(
  metadata: unknown,
): Record<string, unknown> {
  return { ...asRecord(metadata), reconciliationRequired: false };
}

/**
 * Store a new ambiguous/partial provider observation without reopening a review
 * that an operator already rejected for the same evidence.
 */
export function recordRefundReviewEvidence(
  previousMetadata: unknown,
  evidence: RefundEvidenceRecord,
): {
  metadata: Record<string, unknown>;
  changed: boolean;
  reviewRequired: boolean;
} {
  const previous = asRecord(previousMetadata);
  const key = evidenceKey(evidence);
  const resolution = currentResolution(previous);

  if (
    resolution?.decision === "reject" &&
    resolution.evidenceKey === key &&
    previous.reviewRequired !== true
  ) {
    return { metadata: previous, changed: false, reviewRequired: false };
  }

  if (
    previous.reviewRequired === true &&
    currentEvidenceKey(previous) === key
  ) {
    return { metadata: previous, changed: false, reviewRequired: true };
  }

  const metadata = {
    ...previous,
    ...evidence,
    currentEvidenceKey: key,
    reviewRequired: true,
    reconciliationRequired: false,
    reviewHistory: [
      ...reviewHistory(previous),
      { ...evidenceHistoryEntry(evidence), evidenceKey: key },
    ],
  };
  return { metadata, changed: true, reviewRequired: true };
}

export function recordFullRefundEvidence(
  previousMetadata: unknown,
  evidence: RefundEvidenceRecord,
  entitlementReviewRequired: boolean,
): Record<string, unknown> {
  const previous = asRecord(previousMetadata);
  const key = evidenceKey(evidence);
  const history = reviewHistory(previous);
  const alreadyRecorded = currentEvidenceKey(previous) === key;

  return {
    ...previous,
    ...evidence,
    currentEvidenceKey: key,
    reviewRequired: false,
    reconciliationRequired: false,
    entitlementReviewRequired,
    reviewHistory: alreadyRecorded
      ? history
      : [...history, { ...evidenceHistoryEntry(evidence), evidenceKey: key }],
  };
}

function validateInput(
  providerOrderId: string,
  decision: RefundReviewDecision,
  operator: string,
  reason: string,
) {
  if (
    !providerOrderId.trim() ||
    providerOrderId.length > 255 ||
    (decision !== "confirm" && decision !== "reject") ||
    !operator.trim() ||
    operator.length > 120 ||
    !reason.trim() ||
    reason.length > 500
  ) {
    throw new RefundReviewResolutionError("invalid_input");
  }
}

/**
 * Resolve one pending refund-evidence review under the same payment row lock
 * used by provider processing. This function never grants entitlement.
 */
export async function resolveRefundReview(
  input: {
    providerOrderId: string;
    decision: RefundReviewDecision;
    operator: string;
    reason: string;
  },
  database: Database = db,
): Promise<RefundReviewResolutionResult> {
  const providerOrderId = input.providerOrderId.trim();
  const operator = input.operator.trim();
  const reason = input.reason.trim();
  validateInput(providerOrderId, input.decision, operator, reason);

  return database.transaction(async (tx) => {
    const [pay] = await tx
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, providerOrderId))
      .limit(1)
      .for("update");

    if (!pay) throw new RefundReviewResolutionError("unknown_payment");
    if (pay.provider !== "doku") {
      throw new RefundReviewResolutionError("wrong_provider");
    }

    const existing = asRecord(pay.refundMetadata);
    const priorResolution = currentResolution(existing);
    if (existing.reviewRequired !== true) {
      if (priorResolution?.decision === input.decision) {
        return {
          paymentId: pay.id,
          status: pay.status,
          decision: input.decision,
          resolved: false,
          transitioned: false,
          reviewRequired: refundReviewRequired(existing),
        };
      }
      if (priorResolution) {
        throw new RefundReviewResolutionError("review_already_resolved");
      }
      throw new RefundReviewResolutionError("no_pending_review");
    }

    const now = new Date();
    const key = currentEvidenceKey(existing);
    const resolution: ReviewResolutionRecord = {
      decision: input.decision,
      evidenceKey: key,
      operator,
      reason,
      resolvedAt: now.toISOString(),
    };

    let entitlementReviewRequired = existing.entitlementReviewRequired === true;
    if (input.decision === "confirm" && pay.status !== "paid") {
      entitlementReviewRequired ||= pay.paidAt !== null;
      if (pay.kind === "invitation_unlock" && pay.invitationId) {
        const [invitation] = await tx
          .select({ isPaid: invitations.isPaid })
          .from(invitations)
          .where(eq(invitations.id, pay.invitationId))
          .limit(1);
        entitlementReviewRequired ||= invitation?.isPaid === true;
      }
    }

    const metadata = {
      ...existing,
      reviewRequired: false,
      reconciliationRequired: input.decision === "reject",
      entitlementReviewRequired,
      resolution,
      reviewHistory: [
        ...reviewHistory(existing),
        { type: "review_resolution", ...resolution },
      ],
    };
    const previousStatus = pay.status;
    const nextStatus =
      input.decision === "confirm" ? "refunded" : previousStatus;

    await tx
      .update(payments)
      .set({
        status: nextStatus,
        refundRecordedAt:
          input.decision === "confirm"
            ? (pay.refundRecordedAt ?? now)
            : pay.refundRecordedAt,
        refundMetadata: metadata,
      })
      .where(eq(payments.id, pay.id));

    return {
      paymentId: pay.id,
      status: nextStatus,
      decision: input.decision,
      resolved: true,
      transitioned: nextStatus !== previousStatus,
      reviewRequired: refundReviewRequired(metadata),
    };
  });
}
