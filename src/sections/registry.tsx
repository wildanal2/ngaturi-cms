import type { SectionDefinition } from "./types";

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

/**
 * Full default props for a variant: its `defaultProps`, plus each
 * styleOption's default as `s_<key>`, plus any public placeholder data the
 * section's own `dummyProps` fills in.
 */
export function variantDefaultProps(type: string, variantKey: string) {
  const v = getVariant(type, variantKey);
  if (!v) return {};
  const base = structuredClone(v.defaultProps);
  for (const so of v.styleOptions ?? []) {
    base[`s_${so.key}`] = so.default;
  }
  SectionRegistry[type]?.dummyProps?.(variantKey, base);
  return base;
}
