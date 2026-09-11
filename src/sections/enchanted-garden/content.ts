import type { SectionData } from "../types";
import {
  normalizeEventDetails,
  primaryEventDate,
  type NormalizedEvent,
} from "../events/event-data";

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

export function enchantedGardenSectionProps(
  section: SectionData,
  events: NormalizedEvent[],
  eventDate?: string,
) {
  if (section.type === "event-details") {
    return { ...section.props, events };
  }
  if (eventDate && section.type === "hero") {
    return { ...section.props, event_date: eventDate };
  }
  if (eventDate && section.type === "countdown") {
    return { ...section.props, target_date: eventDate };
  }
  return section.props;
}

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
  const events = normalizeEventDetails(journey["event-details"]?.props.events);

  return {
    journey,
    events,
    eventDate: primaryEventDate(events),
    remaining: ordered.filter((section) => !consumed.has(section.id)),
  };
}
