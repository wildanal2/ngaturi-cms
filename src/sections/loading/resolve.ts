import type { SectionData } from "../types";
import type { TemplateComposition } from "@/lib/templates/catalog";

export const DEFAULT_LOADING_MESSAGE = "Mempersiapkan kisah kami…";

/** Presentation fallback only. An explicit hidden row overrides the default. */
export function resolveLoading(
  sections: readonly SectionData[],
  composition: TemplateComposition,
) {
  const explicit = [...sections]
    .sort((a, b) => a.order - b.order)
    .find((section) => section.type === "loading");
  if (explicit) return explicit.visible === false ? null : explicit;
  if (composition !== "cinematic-vintage") return null;
  return {
    id: "cinematic-loading-compatibility",
    type: "loading",
    variant: "cinematic-vintage",
    order: 0,
    visible: true,
    props: { message: DEFAULT_LOADING_MESSAGE },
  } satisfies SectionData;
}
