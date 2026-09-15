import type { TemplatePreset } from "./catalog";

type TemplateCategory = TemplatePreset["category"];

/**
 * Changing a template is visual-only: the persisted invitation category, the
 * active catalog template and the target catalog template must all agree.
 */
export function isTemplateChangeCategoryCompatible({
  invitationCategory,
  sourceCategory,
  targetCategory,
}: {
  invitationCategory: TemplateCategory;
  sourceCategory: TemplateCategory;
  targetCategory: TemplateCategory;
}) {
  return (
    invitationCategory === sourceCategory && sourceCategory === targetCategory
  );
}

export function filterTemplatesByCategory<
  T extends Pick<TemplatePreset, "category">,
>(templates: readonly T[], category: TemplateCategory): T[] {
  return templates.filter((template) => template.category === category);
}
