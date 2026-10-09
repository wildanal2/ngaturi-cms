import { applyPaymentObservation, type ApplyMetadata } from "./grant";
import { normalizeDokuResult } from "./doku-provider";
import { db, type Database } from "@/lib/db";
import type { DokuPaymentResult, DokuStatus } from "./doku";

/** Compatibility boundary for existing DOKU operator refund commands. */
export function applyDokuResult(
  result: DokuPaymentResult,
  metadata: ApplyMetadata,
  database: Database = db,
) {
  return applyPaymentObservation(
    normalizeDokuResult(result),
    metadata,
    database,
  );
}

export function dokuResult(
  invoiceNumber: string,
  amount: DokuPaymentResult["amount"],
  status: DokuStatus,
  currency?: string,
  refund?: DokuPaymentResult["refund"],
): DokuPaymentResult {
  return { invoiceNumber, amount, status, currency, refund };
}
