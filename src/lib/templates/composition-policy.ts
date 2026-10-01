import { isCinematicCoreSectionType } from "@/sections/cinematic/content";
import { isSekarJawa3DCoreSectionType } from "@/sections/sekar-jawa-3d/content";
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

const SEKAR_JAWA_3D_COMPOSITION_POLICY: CompositionPolicy = {
  composition: "sekar-jawa-3d",
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
    case "sekar-jawa-3d":
      return isSekarJawa3DCoreSectionType(sectionType);
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
    case "sekar-jawa-3d":
      return SEKAR_JAWA_3D_COMPOSITION_POLICY;
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
