import type { InferSelectModel } from "drizzle-orm";
import type { invitations } from "@/lib/db/schema";

export type Invitation = InferSelectModel<typeof invitations>;

export const FREE_TRIAL_EDIT_DAYS = 7;
export const FREE_TRIAL_MAX_PHOTOS = 5;

/** Builder terkunci: trial yang masa editnya lewat & belum dibayar. */
export function isEditLocked(inv: Pick<Invitation, "plan" | "isPaid" | "editExpiresAt">): boolean {
  if (inv.isPaid) return false;
  if (inv.plan !== "free_trial") return false;
  if (!inv.editExpiresAt) return false;
  return inv.editExpiresAt.getTime() < Date.now();
}

export function editExpiresAtFor(plan: Invitation["plan"], createdAt = new Date()): Date | null {
  if (plan !== "free_trial") return null;
  return new Date(createdAt.getTime() + FREE_TRIAL_EDIT_DAYS * 86_400_000);
}

export function hasWatermark(inv: Pick<Invitation, "plan" | "isPaid">): boolean {
  return !inv.isPaid && inv.plan === "free_trial";
}
