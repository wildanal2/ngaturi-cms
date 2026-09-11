import type { SectionData } from "../types";

export const ENCHANTED_GARDEN_OWNED_CORE_TYPES = [
  "cover",
  "hero",
  "quote",
  "couple-intro",
  "story",
  "event-details",
  "map-location",
  "countdown",
  "gallery",
  "closing",
] as const;

export type EnchantedGardenCoreType =
  (typeof ENCHANTED_GARDEN_OWNED_CORE_TYPES)[number];

export const ENCHANTED_GARDEN_JOURNEY_SECTION_TYPES = [
  "cover",
  "hero",
  "quote",
  "couple-intro",
  "story",
  "event-details",
  "map-location",
  "countdown",
  "gallery",
  "rsvp",
  "guestbook",
  "gift",
  "closing",
] as const;

type EnchantedGardenJourneySectionType =
  (typeof ENCHANTED_GARDEN_JOURNEY_SECTION_TYPES)[number];

export function isEnchantedGardenCoreSectionType(type: string) {
  return ENCHANTED_GARDEN_OWNED_CORE_TYPES.includes(
    type as EnchantedGardenCoreType,
  );
}

function isJourneySectionType(
  type: string,
): type is EnchantedGardenJourneySectionType {
  return ENCHANTED_GARDEN_JOURNEY_SECTION_TYPES.includes(
    type as EnchantedGardenJourneySectionType,
  );
}

function firstEventDate(section?: SectionData) {
  const events = section?.props.events;
  if (!Array.isArray(events)) return undefined;
  const date = (events[0] as { date?: unknown } | undefined)?.date;
  return typeof date === "string" ? date : undefined;
}

/**
 * A presentation view over existing section objects. The first visible
 * semantic occurrence owns its journey stop; duplicates and all unconsumed sections
 * remain in normal flow so user content is never discarded.
 */
export function enchantedGardenContent(sections: readonly SectionData[]) {
  const ordered = [...sections]
    .filter((section) => section.visible !== false)
    .sort((a, b) => a.order - b.order);
  const journey: Partial<
    Record<EnchantedGardenJourneySectionType, SectionData>
  > = {};

  for (const section of ordered) {
    if (isJourneySectionType(section.type) && !journey[section.type]) {
      journey[section.type] = section;
    }
  }

  const consumed = new Set(
    Object.values(journey).map((section) => section?.id),
  );

  return {
    journey,
    eventDate: firstEventDate(journey["event-details"]),
    remaining: ordered.filter((section) => !consumed.has(section.id)),
  };
}
