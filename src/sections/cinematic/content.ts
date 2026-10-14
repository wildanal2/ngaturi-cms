import type { SectionData } from "../types";
import { cinematicStoryItems } from "../story/cinematic-items";

export const CINEMATIC_VARIANT = "cinematic-vintage";
const CORE = [
  "hero",
  "couple-intro",
  "quote",
  "story",
  "gallery",
  "event-details",
  "map-location",
  "closing",
] as const;
type CoreType = (typeof CORE)[number];
const INTERACTIONS = ["countdown", "rsvp", "gift", "guestbook"] as const;
type ChapterType = CoreType | (typeof INTERACTIONS)[number];

// Presentation compatibility only: never rewrite stored variants or content.
const LEGACY: Record<string, string> = {
  story: "timeline",
  countdown: "plain",
  rsvp: "form-card",
  gift: "minimal",
  guestbook: "chat",
  music: "disc",
  navigation: "bar",
};

export function cinematicVariant(
  section: Pick<SectionData, "type" | "variant">,
) {
  return LEGACY[section.type] === section.variant
    ? CINEMATIC_VARIANT
    : section.variant;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;
export function hasCinematicContent(section: SectionData) {
  const p = section.props;
  switch (section.type) {
    case "story":
      return cinematicStoryItems(p.items).length > 0;
    case "quote":
      return text(p.text);
    case "gallery":
      return (
        Array.isArray(p.images) && p.images.some((image) => text(image?.url))
      );
    case "event-details":
      return Array.isArray(p.events) && p.events.length > 0;
    case "gift":
      return (
        Array.isArray(p.bank_accounts) &&
        p.bank_accounts.some((account) => text(account?.account_number))
      );
    case "map-location":
      return [p.venue_name, p.address, p.maps_url].some(text);
    case "countdown":
      return (
        text(p.target_date) &&
        Number.isFinite(Date.parse(p.target_date as string))
      );
    default:
      return true;
  }
}

/** Sections whose presentation is owned by the cinematic composition. */
export function isCinematicCoreSectionType(type: string) {
  return type === "cover" || type === "loading" || CORE.includes(type as CoreType);
}

/** The persisted hero variant opts into orchestration; no template ID/schema is needed. */
export function isCinematicComposition(
  sections: readonly Pick<SectionData, "type" | "variant" | "visible">[],
) {
  return sections.some(
    (s) =>
      s.visible !== false &&
      s.type === "hero" &&
      s.variant === CINEMATIC_VARIANT,
  );
}

/** References to existing sections only. Never hydrate defaults during editing. */
export function cinematicContent(
  sections: readonly SectionData[],
  active?: boolean,
) {
  const ordered = sections
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order);
  const core: Partial<Record<ChapterType, SectionData>> = {};
  const consumed = new Set<string>();
  if (active ?? isCinematicComposition(ordered)) {
    for (const type of [...CORE, ...INTERACTIONS]) {
      const section = ordered.find(
        (s) => s.type === type && cinematicVariant(s) === CINEMATIC_VARIANT,
      );
      if (section) {
        consumed.add(section.id);
        if (hasCinematicContent(section)) core[type] = section;
      }
    }
  }
  const remaining = ordered.filter((s) => !consumed.has(s.id));
  return {
    core,
    remaining,
    siblingTypes: [...Object.values(core), ...remaining].map((s) => s!.type),
  };
}
