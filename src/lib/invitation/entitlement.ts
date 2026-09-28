import type { InferSelectModel } from "drizzle-orm";
import type { invitations } from "@/lib/db/schema";

export type Invitation = InferSelectModel<typeof invitations>;

export const FREE_TRIAL_EDIT_DAYS = 3;
export const BASIC_MAX_GALLERY_PHOTOS = 30;

/** Kuota bikin undangan untuk akun gratis. */
export const FREE_INVITATION_QUOTA = 1;
/** Tambahan kuota per paket berbayar (Basic / Premium): +1 masing-masing. */
export const PAID_PACKAGE_QUOTA_BONUS = 1;

/** Total undangan yang boleh dibuat user = 1 gratis + bonus dari paket. */
export function maxInvitationsFor(
  quotaBonus: number | null | undefined,
): number {
  return FREE_INVITATION_QUOTA + Math.max(0, quotaBonus ?? 0);
}

/** Builder terkunci: trial tanpa batas waktu aktif atau yang sudah kedaluwarsa. */
export function isEditLocked(
  inv: Pick<Invitation, "plan" | "isPaid" | "editExpiresAt">,
  now = new Date(),
): boolean {
  if (inv.isPaid) return false;
  if (inv.plan !== "free_trial") return false;
  if (!inv.editExpiresAt) return true;
  return inv.editExpiresAt.getTime() <= now.getTime();
}

export function editExpiresAtFor(
  plan: Invitation["plan"],
  createdAt = new Date(),
): Date | null {
  if (plan !== "free_trial") return null;
  return new Date(createdAt.getTime() + FREE_TRIAL_EDIT_DAYS * 86_400_000);
}

export function hasWatermark(
  inv: Pick<Invitation, "plan" | "isPaid">,
): boolean {
  return !inv.isPaid && inv.plan === "free_trial";
}

type EntitlementInput = Pick<Invitation, "plan" | "isPaid" | "editExpiresAt">;

export interface InvitationEntitlements {
  canEdit: boolean;
  canPublish: boolean;
  canUsePremiumFeatures: boolean;
  canUploadAudio: boolean;
  galleryPhotoLimit: number | null;
}

/**
 * Kontrak otorisasi internal untuk seluruh mutasi undangan. Cron hanya
 * mematerialisasi `is_edit_locked`; keputusan request-time tetap memakai
 * `edit_expires_at` sebagai batas trial yang otoritatif.
 */
export function invitationEntitlements(
  inv: EntitlementInput,
  now = new Date(),
): InvitationEntitlements {
  const trialActive =
    inv.plan === "free_trial" && !inv.isPaid && !isEditLocked(inv, now);
  const paid = inv.isPaid;
  const canEdit = paid || trialActive;
  const premium =
    (paid && (inv.plan === "premium" || inv.plan === "business")) ||
    trialActive;

  return {
    canEdit,
    canPublish: canEdit,
    canUsePremiumFeatures: premium,
    canUploadAudio: canEdit && premium,
    galleryPhotoLimit:
      paid && inv.plan === "basic" ? BASIC_MAX_GALLERY_PHOTOS : null,
  };
}

export function canEditInvitation(
  inv: EntitlementInput,
  now = new Date(),
): boolean {
  return invitationEntitlements(inv, now).canEdit;
}

export function canPublishInvitation(
  inv: EntitlementInput,
  now = new Date(),
): boolean {
  return invitationEntitlements(inv, now).canPublish;
}

/** Masa coba masih aktif: trial gratis yang belum dikunci / kedaluwarsa. */
export function isTrialActive(
  inv: EntitlementInput,
  now = new Date(),
): boolean {
  return (
    inv.plan === "free_trial" &&
    !inv.isPaid &&
    invitationEntitlements(inv, now).canEdit
  );
}

/**
 * Akses ke fitur Pro/Premium (undangan per-tamu, dsb). Selama masa coba
 * SEMUA fitur terbuka — pembatasnya hanya watermark & masa edit 3 hari.
 * Setelah dibayar: paket Premium/Business membuka fitur ini permanen.
 */
export function hasProFeatures(inv: EntitlementInput): boolean {
  return invitationEntitlements(inv).canUsePremiumFeatures;
}

export function canChangeToTemplate(
  inv: EntitlementInput,
  targetTier: "free" | "basic" | "premium",
  targetIsCurrent = false,
  now = new Date(),
): boolean {
  const policy = invitationEntitlements(inv, now);
  if (!policy.canEdit) return false;
  return (
    targetIsCurrent || targetTier !== "premium" || policy.canUsePremiumFeatures
  );
}

export function canSetGalleryPhotoCount(
  inv: EntitlementInput,
  currentCount: number,
  nextCount: number,
  now = new Date(),
): boolean {
  const policy = invitationEntitlements(inv, now);
  if (!policy.canEdit) return false;
  if (policy.galleryPhotoLimit === null) return true;
  if (currentCount > policy.galleryPhotoLimit) {
    return nextCount <= currentCount;
  }
  return nextCount <= policy.galleryPhotoLimit;
}

export function canUploadMedia(
  inv: EntitlementInput,
  kind: "image" | "audio",
  currentGalleryPhotoCount = 0,
  now = new Date(),
): boolean {
  const policy = invitationEntitlements(inv, now);
  if (!policy.canEdit) return false;
  if (kind === "audio") return policy.canUploadAudio;
  return (
    policy.galleryPhotoLimit === null ||
    currentGalleryPhotoCount < policy.galleryPhotoLimit
  );
}

export type AccountTier = "premium" | "trial" | "free";

/** Status akun untuk badge: berbayar Premium, sedang masa coba, atau gratis. */
export function accountTier(invs: EntitlementInput[]): {
  tier: AccountTier;
  trialDaysLeft: number | null;
} {
  if (
    invs.some(
      (i) => i.isPaid && (i.plan === "premium" || i.plan === "business"),
    )
  ) {
    return { tier: "premium", trialDaysLeft: null };
  }
  const trials = invs.filter((i) => isTrialActive(i));
  if (trials.length > 0) {
    const soonest = trials
      .map((i) => i.editExpiresAt?.getTime())
      .filter((n): n is number => typeof n === "number")
      .sort((a, b) => a - b)[0];
    const days = soonest
      ? Math.max(0, Math.ceil((soonest - Date.now()) / 86_400_000))
      : null;
    return { tier: "trial", trialDaysLeft: days };
  }
  return { tier: "free", trialDaysLeft: null };
}

/** Nama paket yang ramah untuk ditampilkan ke pengguna awam. */
export function planLabel(
  inv: Pick<Invitation, "plan" | "isPaid">,
): "Gratis" | "Basic" | "Premium" {
  if (!inv.isPaid || inv.plan === "free_trial") return "Gratis";
  return inv.plan === "premium" ? "Premium" : "Basic";
}

export type InvitationStage = "draft" | "published" | "edit-locked" | "expired";

/** Satu status ringkas untuk kartu undangan + kalimat "langkah berikutnya". */
export function invitationStage(
  inv: Pick<
    Invitation,
    | "status"
    | "plan"
    | "isPaid"
    | "editExpiresAt"
    | "isEditLocked"
    | "expiresAt"
  >,
): {
  stage: InvitationStage;
  label: string;
  hint: string;
  tone: "neutral" | "good" | "warn";
} {
  if (
    inv.status === "expired" ||
    (inv.expiresAt && inv.expiresAt.getTime() < Date.now())
  ) {
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
