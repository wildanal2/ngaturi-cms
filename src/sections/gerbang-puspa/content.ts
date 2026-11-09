import type { SectionData } from "../types";

/** Server-safe detection; the template retains the standard composition. */
export function hasGerbangPuspa(sections: readonly SectionData[]) {
  return sections.some(
    (section) =>
      section.variant === "gerbang-puspa" && section.visible !== false,
  );
}

/** Interior word separators must never consume a person named Dan. */
export function splitGerbangPuspaNames(value: string) {
  const pieces = (
    value.includes("&")
      ? value.split(/\s*&\s*/)
      : value.split(/\s+(?:and|dan)\s+/i)
  )
    .map((name) => name.trim())
    .filter(Boolean);
  return pieces.length === 2 ? pieces : [value.trim()];
}
