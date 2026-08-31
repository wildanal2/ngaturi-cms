import type { SectionDefinition } from "./types";
import {
  dummyHero,
  dummyBride,
  dummyGroom,
  dummyGallery,
  dummyClosing,
} from "./dummy";
import { DUMMY_MAP_EMBED, DUMMY_MAP_LINK, bankLogo } from "./fields";

import { coverSection } from "./cover";
import { heroSection } from "./hero";
import { coupleSection } from "./couple";
import { eventsSection } from "./events";
import { countdownSection } from "./countdown";
import { gallerySection } from "./gallery";
import { quoteSection } from "./quote";
import { rsvpSection } from "./rsvp";
import { guestbookSection } from "./guestbook";
import { mapSection } from "./map";
import { musicSection } from "./music";
import { navigationSection } from "./navigation";
import { closingSection } from "./closing";
import { giftSection } from "./gift";

/**
 * type → SectionDefinition. Each section lives in its own folder
 * (`src/sections/<type>/`) with one file per variant component and an
 * `index.ts` that assembles its SectionDefinition. Add a new variant by
 * dropping a `.tsx` file in the folder and registering it in that index.
 */
export const SectionRegistry: Record<string, SectionDefinition> = {
  cover: coverSection,
  hero: heroSection,
  "couple-intro": coupleSection,
  "event-details": eventsSection,
  countdown: countdownSection,
  gallery: gallerySection,
  quote: quoteSection,
  rsvp: rsvpSection,
  guestbook: guestbookSection,
  "map-location": mapSection,
  music: musicSection,
  navigation: navigationSection,
  closing: closingSection,
  gift: giftSection,
};

export function getSectionDefinition(type: string) {
  return SectionRegistry[type];
}

export function getVariant(type: string, variant: string) {
  return SectionRegistry[type]?.variants[variant];
}

export function getAllSections() {
  return Object.values(SectionRegistry);
}

/** Category → human label + display order, for the "Tambah bagian" menu. */
export const SECTION_CATEGORIES: {
  key: SectionDefinition["category"];
  label: string;
}[] = [
  { key: "hero", label: "Pembuka" },
  { key: "content", label: "Isi Undangan" },
  { key: "interactive", label: "Interaktif" },
  { key: "footer", label: "Navigasi & Penutup" },
];

export function getSectionsByCategory() {
  return SECTION_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    sections: getAllSections().filter((s) => s.category === key),
  })).filter((g) => g.sections.length > 0);
}

/** default props termasuk nilai styleOptions + gambar dummy publik. */
export function variantDefaultProps(type: string, variantKey: string) {
  const v = getVariant(type, variantKey);
  if (!v) return {};
  const base = structuredClone(v.defaultProps);
  for (const so of v.styleOptions ?? []) {
    base[`s_${so.key}`] = so.default;
  }

  // isi gambar contoh publik kalau belum ada
  if (type === "hero" && !base.background_image) {
    base.background_image = dummyHero(variantKey);
  }
  if (type === "cover" && variantKey !== "minimal" && !base.background_image) {
    base.background_image = dummyHero(`cover-${variantKey}`);
  }
  if (type === "couple-intro") {
    const bride = (base.bride ?? {}) as Record<string, unknown>;
    const groom = (base.groom ?? {}) as Record<string, unknown>;
    if (!bride.photo) base.bride = { ...bride, photo: dummyBride };
    if (!groom.photo) base.groom = { ...groom, photo: dummyGroom };
  }
  if (
    type === "gallery" &&
    Array.isArray(base.images) &&
    base.images.length === 0
  ) {
    base.images = dummyGallery(variantKey);
  }
  if (type === "closing" && variantKey === "photo" && !base.photo) {
    base.photo = dummyClosing();
  }
  if (type === "map-location") {
    if (!base.embed_url) base.embed_url = DUMMY_MAP_EMBED;
    if (!base.maps_url) base.maps_url = DUMMY_MAP_LINK;
  }
  if (type === "gift" && Array.isArray(base.bank_accounts)) {
    base.bank_accounts = (base.bank_accounts as Record<string, unknown>[]).map(
      (b) => ({
        ...b,
        logo_url: b.logo_url || bankLogo(String(b.bank_name || "bank")),
      }),
    );
  }
  return base;
}
