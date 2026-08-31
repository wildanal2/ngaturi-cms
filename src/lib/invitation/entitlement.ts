import type { InferSelectModel } from "drizzle-orm";
import type { invitations } from "@/lib/db/schema";

export type Invitation = InferSelectModel<typeof invitations>;

export const FREE_TRIAL_EDIT_DAYS = 3;
export const FREE_TRIAL_MAX_PHOTOS = 5;

/** Kuota bikin undangan untuk akun gratis. */
export const FREE_INVITATION_QUOTA = 1;
/** Tambahan kuota per paket berbayar (Basic / Premium): +1 masing-masing. */
export const PAID_PACKAGE_QUOTA_BONUS = 1;

/** Total undangan yang boleh dibuat user = 1 gratis + bonus dari paket. */
export function maxInvitationsFor(quotaBonus: number | null | undefined): number {
  return FREE_INVITATION_QUOTA + Math.max(0, quotaBonus ?? 0);
}

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

type EntitlementInput = Pick<
  Invitation,
  "plan" | "isPaid" | "editExpiresAt" | "isEditLocked"
>;

/** Masa coba masih aktif: trial gratis yang belum dikunci / kedaluwarsa. */
export function isTrialActive(inv: EntitlementInput): boolean {
  return (
    inv.plan === "free_trial" &&
    !inv.isPaid &&
    !inv.isEditLocked &&
    !isEditLocked(inv)
  );
}

/**
 * Akses ke fitur Pro/Premium (undangan per-tamu, dsb). Selama masa coba
 * SEMUA fitur terbuka — pembatasnya hanya watermark & masa edit 3 hari.
 * Setelah dibayar: paket Premium/Business membuka fitur ini permanen.
 */
export function hasProFeatures(inv: EntitlementInput): boolean {
  if (inv.isPaid && (inv.plan === "premium" || inv.plan === "business")) {
    return true;
  }
  return isTrialActive(inv);
}

/** Nama paket yang ramah untuk ditampilkan ke pengguna awam. */
export function planLabel(
  inv: Pick<Invitation, "plan" | "isPaid">,
): "Gratis" | "Basic" | "Premium" {
  if (!inv.isPaid || inv.plan === "free_trial") return "Gratis";
  return inv.plan === "premium" ? "Premium" : "Basic";
}

export type InvitationStage =
  | "draft"
  | "published"
  | "edit-locked"
  | "expired";

/** Satu status ringkas untuk kartu undangan + kalimat "langkah berikutnya". */
export function invitationStage(
  inv: Pick<
    Invitation,
    "status" | "plan" | "isPaid" | "editExpiresAt" | "isEditLocked" | "expiresAt"
  >,
): { stage: InvitationStage; label: string; hint: string; tone: "neutral" | "good" | "warn" } {
  if (inv.status === "expired" || (inv.expiresAt && inv.expiresAt.getTime() < Date.now())) {
    return {
      stage: "expired",
      label: "Kedaluwarsa",
      hint: "Masa tayang undangan sudah berakhir. Perpanjang untuk menayangkan lagi.",
      tone: "warn",
    };
  }
  if (inv.status === "published") {
    return {
      stage: "published",
      label: "Sudah terbit",
      hint: "Undangan aktif. Bagikan tautannya ke tamu lewat WhatsApp.",
      tone: "good",
    };
  }
  if (isEditLocked(inv) || inv.isEditLocked) {
    return {
      stage: "edit-locked",
      label: "Masa edit habis",
      hint: "Undangan tetap bisa dilihat, tapi untuk mengubah isinya upgrade dulu.",
      tone: "warn",
    };
  }
  return {
    stage: "draft",
    label: "Draf",
    hint: "Masih draf. Lengkapi isinya lalu tekan Terbitkan di dalam editor.",
    tone: "neutral",
  };
}
