import { isCinematicCoreSectionType } from "@/sections/cinematic/content";
import { isEnchantedGardenCoreSectionType } from "@/sections/enchanted-garden/content";
import type { TemplateComposition } from "./catalog";

export interface CompositionPolicy {
  composition: TemplateComposition;
  canEditMotion: boolean;
  canEditCoreVariant: boolean;
  canReorderCoreSection: boolean;
}

export const STANDARD_COMPOSITION_POLICY: CompositionPolicy = {
  composition: "standard",
  canEditMotion: true,
  canEditCoreVariant: true,
  canReorderCoreSection: true,
};

const CINEMATIC_VINTAGE_COMPOSITION_POLICY: CompositionPolicy = {
  composition: "cinematic-vintage",
  canEditMotion: false,
  canEditCoreVariant: false,
  canReorderCoreSection: false,
};

const ENCHANTED_GARDEN_COMPOSITION_POLICY: CompositionPolicy = {
  composition: "enchanted-garden",
  canEditMotion: false,
  canEditCoreVariant: false,
  canReorderCoreSection: false,
};

function isCompositionCoreSection(
  composition: TemplateComposition,
  sectionType: string,
) {
  switch (composition) {
    case "standard":
      return false;
    case "cinematic-vintage":
      return isCinematicCoreSectionType(sectionType);
    case "enchanted-garden":
      return isEnchantedGardenCoreSectionType(sectionType);
  }
}

export function getCompositionPolicy({
  composition,
}: {
  composition: TemplateComposition;
}): CompositionPolicy {
  switch (composition) {
    case "standard":
      return STANDARD_COMPOSITION_POLICY;
    case "cinematic-vintage":
      return CINEMATIC_VINTAGE_COMPOSITION_POLICY;
    case "enchanted-garden":
      return ENCHANTED_GARDEN_COMPOSITION_POLICY;
  }
}

export function canEditSectionVariant(
  policy: CompositionPolicy,
  sectionType: string,
) {
  return (
    policy.canEditCoreVariant ||
    !isCompositionCoreSection(policy.composition, sectionType)
  );
}

export function canReorderSection(
  policy: CompositionPolicy,
  sectionType: string,
) {
  return (
    policy.canReorderCoreSection ||
    !isCompositionCoreSection(policy.composition, sectionType)
  );
}
