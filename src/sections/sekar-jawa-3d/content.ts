import type { SectionData } from "../types";
import {
  normalizeEventDetails,
  primaryEventDate,
  type NormalizedEvent,
} from "../events/event-data";

export const SEKAR_JAWA_3D_OWNED_CORE_TYPES = [
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

export type SekarJawa3DCoreType =
  (typeof SEKAR_JAWA_3D_OWNED_CORE_TYPES)[number];

export const SEKAR_JAWA_3D_JOURNEY_SECTION_TYPES = [
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

type SekarJawa3DJourneySectionType =
  (typeof SEKAR_JAWA_3D_JOURNEY_SECTION_TYPES)[number];

export function sekarJawa3DSectionProps(
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

export function isSekarJawa3DCoreSectionType(type: string) {
  return SEKAR_JAWA_3D_OWNED_CORE_TYPES.includes(
    type as SekarJawa3DCoreType,
  );
}

function isJourneySectionType(
  type: string,
): type is SekarJawa3DJourneySectionType {
  return SEKAR_JAWA_3D_JOURNEY_SECTION_TYPES.includes(
    type as SekarJawa3DJourneySectionType,
  );
}

/**
 * A presentation view over existing section objects. The first visible
 * semantic occurrence owns its journey stop; duplicates and all unconsumed sections
 * remain in normal flow so user content is never discarded.
 */
export function sekarJawa3DContent(sections: readonly SectionData[]) {
  const ordered = [...sections]
    .filter((section) => section.visible !== false)
    .sort((a, b) => a.order - b.order);
  const journey: Partial<
    Record<SekarJawa3DJourneySectionType, SectionData>
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
