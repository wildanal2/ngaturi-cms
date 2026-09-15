import type { SectionData } from "../types";

export const CINEMATIC_VARIANT = "cinematic-vintage";
const CORE = [
  "hero",
  "couple-intro",
  "quote",
  "gallery",
  "event-details",
  "map-location",
  "closing",
] as const;
type CoreType = (typeof CORE)[number];

/** Sections whose presentation is owned by the cinematic composition. */
export function isCinematicCoreSectionType(type: string) {
  return type === "cover" || CORE.includes(type as CoreType);
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
  const core: Partial<Record<CoreType, SectionData>> = {};
  if (active ?? isCinematicComposition(ordered)) {
    for (const type of CORE) {
      core[type] = ordered.find(
        (s) => s.type === type && s.variant === CINEMATIC_VARIANT,
      );
    }
  }
  const consumed = new Set(Object.values(core).map((s) => s?.id));
  return { core, remaining: ordered.filter((s) => !consumed.has(s.id)) };
}
