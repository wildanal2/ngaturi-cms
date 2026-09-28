import { canonicalTemplateId } from "@/lib/templates/identity";
import { BASIC_MAX_GALLERY_PHOTOS } from "./entitlement";
import { SectionRegistry } from "@/sections/registry";
import type { SectionData } from "@/sections/types";
import type { GlobalSettings } from "@/sections/types";

export function countGalleryPhotos(sections: readonly SectionData[]): number {
  return sections.reduce((total, section) => {
    if (section.type !== "gallery") return total;
    const images = section.props?.images;
    if (!Array.isArray(images)) return total;
    return (
      total +
      images.filter(
        (image) =>
          typeof image === "object" &&
          image !== null &&
          typeof (image as { url?: unknown }).url === "string" &&
          Boolean((image as { url: string }).url.trim()),
      ).length
    );
  }, 0);
}

function galleryPhotoUrls(sections: readonly SectionData[]): string[] {
  return sections.flatMap((section) => {
    if (section.type !== "gallery" || !Array.isArray(section.props?.images)) {
      return [];
    }
    return section.props.images.flatMap((image) => {
      if (typeof image !== "object" || image === null) return [];
      const url = (image as { url?: unknown }).url;
      return typeof url === "string" && url.trim() ? [url.trim()] : [];
    });
  });
}

function addsGalleryPhoto(
  current: readonly SectionData[],
  next: readonly SectionData[],
): boolean {
  const remaining = new Map<string, number>();
  for (const url of galleryPhotoUrls(current)) {
    remaining.set(url, (remaining.get(url) ?? 0) + 1);
  }
  for (const url of galleryPhotoUrls(next)) {
    const available = remaining.get(url) ?? 0;
    if (available === 0) return true;
    remaining.set(url, available - 1);
  }
  return false;
}

function musicUrl(section: SectionData): string {
  const value = section.props?.audio_url;
  return typeof value === "string" ? value.trim() : "";
}

function isPremiumVariant(section: SectionData): boolean {
  const definition = SectionRegistry[section.type];
  const variant = definition?.variants[canonicalTemplateId(section.variant)];
  return Boolean(definition?.isPremium || variant?.isPremium);
}

export type BasicCompositionViolation =
  "gallery-photo-limit" | "music-change" | "premium-feature-expansion";

/**
 * Basic tetap merender artefak Premium yang sudah ada. Fungsi ini hanya
 * menolak penambahan/perluasan baru, bukan perubahan konten biasa atau
 * penghapusan artefak yang di-grandfather.
 */
export function basicCompositionViolation(
  current: readonly SectionData[],
  next: readonly SectionData[],
  canSetPhotoCount: (currentCount: number, nextCount: number) => boolean,
  currentGlobal?: GlobalSettings,
  nextGlobal?: GlobalSettings,
): BasicCompositionViolation | null {
  const currentPhotoCount = countGalleryPhotos(current);
  const nextPhotoCount = countGalleryPhotos(next);
  if (
    !canSetPhotoCount(currentPhotoCount, nextPhotoCount) ||
    (currentPhotoCount > BASIC_MAX_GALLERY_PHOTOS &&
      addsGalleryPhoto(current, next))
  ) {
    return "gallery-photo-limit";
  }

  const currentGlobalMusic = currentGlobal?.music_url?.trim() ?? "";
  const nextGlobalMusic = nextGlobal?.music_url?.trim() ?? "";
  if (nextGlobalMusic && nextGlobalMusic !== currentGlobalMusic) {
    return "music-change";
  }

  const currentById = new Map(current.map((section) => [section.id, section]));
  for (const section of next) {
    const previous = currentById.get(section.id);

    if (section.type === "music") {
      if (!previous || previous.type !== "music") {
        return "premium-feature-expansion";
      }
      const before = musicUrl(previous);
      const after = musicUrl(section);
      if (after && after !== before) return "music-change";
    }

    if (isPremiumVariant(section)) {
      if (
        !previous ||
        previous.type !== section.type ||
        canonicalTemplateId(previous.variant) !==
          canonicalTemplateId(section.variant)
      ) {
        return "premium-feature-expansion";
      }
    }
  }

  return null;
}
