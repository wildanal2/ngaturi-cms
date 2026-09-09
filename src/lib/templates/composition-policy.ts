import type { SectionData } from "@/sections/types";
import {
  isCinematicComposition,
  isCinematicCoreSectionType,
} from "@/sections/cinematic/content";
import type { TemplateComposition } from "./catalog";

export interface CompositionPolicy {
  composition: TemplateComposition;
  isCinematic: boolean;
  canEditMotion: boolean;
  canEditCoreVariant: boolean;
  canReorderCoreSection: boolean;
}

export const STANDARD_COMPOSITION_POLICY: CompositionPolicy = {
  composition: "standard",
  isCinematic: false,
  canEditMotion: true,
  canEditCoreVariant: true,
  canReorderCoreSection: true,
};

const CINEMATIC_COMPOSITION_POLICY: CompositionPolicy = {
  composition: "cinematic",
  isCinematic: true,
  canEditMotion: false,
  canEditCoreVariant: false,
  canReorderCoreSection: false,
};

export function getCompositionPolicy({
  templateComposition,
  sections,
}: {
  templateComposition?: TemplateComposition;
  sections: readonly Pick<SectionData, "type" | "variant" | "visible">[];
}): CompositionPolicy {
  return templateComposition === "cinematic" || isCinematicComposition(sections)
    ? CINEMATIC_COMPOSITION_POLICY
    : STANDARD_COMPOSITION_POLICY;
}

export function canEditSectionVariant(
  policy: CompositionPolicy,
  sectionType: string,
) {
  return (
    policy.canEditCoreVariant || !isCinematicCoreSectionType(sectionType)
  );
}

export function canReorderSection(
  policy: CompositionPolicy,
  sectionType: string,
) {
  return (
    policy.canReorderCoreSection || !isCinematicCoreSectionType(sectionType)
  );
}
