import { SectionRegistry, variantDefaultProps } from "@/sections/registry";
import { CINEMATIC_VARIANT } from "@/sections/cinematic/content";
import type { SectionData } from "@/sections/types";
import type { TemplatePreset } from "./catalog";

/**
 * Merge each preset section's props over its variant's defaultProps (which
 * include public dummy images + style defaults) so a template that only
 * overrides a couple of fields still renders complete — e.g.
 * `s("gift","minimal",{})` gets example bank accounts.
 */
const isEmpty = (v: unknown) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** preset value wins, but empty values keep the (dummy) default; plain
 *  objects merge one level deep so e.g. `{ bride: { name } }` keeps the
 *  default `bride.photo`. Exported for tests. */
export function mergeValue(def: unknown, override: unknown): unknown {
  if (isEmpty(override) && !isEmpty(def)) return def;
  if (isPlainObject(def) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...def };
    for (const [k, v] of Object.entries(override)) {
      out[k] = mergeValue(def[k], v);
    }
    return out;
  }
  return override;
}

export function hydrateTemplateSections(
  t: TemplatePreset,
): (Omit<SectionData, "id"> & { id: string })[] {
  return t.sections.map((s, i) => {
    const defaults = variantDefaultProps(s.type, s.variant);
    const props: Record<string, unknown> = { ...defaults };
    for (const [k, v] of Object.entries(s.props)) {
      props[k] = mergeValue(defaults[k], v);
    }
    // array position is the source of truth for order
    return { ...s, id: `t-${i}`, order: i, props };
  });
}

const VISUAL_GLOBAL_KEYS = new Set([
  "font_family",
  "color_primary",
  "color_secondary",
  "color_background",
  "animation",
  "animation_repeat",
  "presentationMode",
]);

/** User/business settings survive while the target owns global presentation. */
export function mergeInvitationGlobalSettings(
  existing: object,
  target: object,
  sourceCinematic: boolean,
  targetCinematic: boolean,
) {
  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(existing)) {
    if (!VISUAL_GLOBAL_KEYS.has(key)) merged[key] = value;
  }

  if (targetCinematic) {
    const currentMode = sourceCinematic
      ? (existing as Record<string, unknown>).presentationMode
      : undefined;
    merged.presentationMode =
      currentMode === "cinematic" || currentMode === "simple"
        ? currentMode
        : merged.presentationMode === "simple"
          ? "simple"
          : "cinematic";
  } else {
    delete merged.presentationMode;
  }

  return merged;
}

const PRESENTATION_PROPS = new Set([
  "accent_color",
  "background_desktop_image",
  "background_image",
  "background_texture",
  "columns",
  "couple_image",
  "divider_image",
  "envelope_color",
  "floral_left_image",
  "floral_right_image",
  "flower_left_image",
  "flower_right_image",
  "garland_left_image",
  "garland_right_image",
  "has_countdown",
  "ornament_bl_images",
  "ornament_tr_images",
  "ornament_variant",
  "overlay_opacity",
  "save_the_date_image",
  "seal_image",
  "section_icon",
  "texture_image",
]);

const USER_REPLACEABLE_MEDIA = new Set([
  "background_desktop_image",
  "background_image",
  "background_texture",
  "couple_image",
]);

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

function mergeBusinessValue(target: unknown, existing: unknown): unknown {
  if (isPlainObject(target) && isPlainObject(existing)) {
    const merged: Record<string, unknown> = structuredClone(target);
    for (const [key, value] of Object.entries(existing)) {
      merged[key] = mergeBusinessValue(target[key], value);
    }
    return merged;
  }
  return structuredClone(existing);
}

function mergeSectionContent(
  target: Record<string, unknown>,
  existing: Record<string, unknown>,
  sourceDefaults?: Record<string, unknown>,
) {
  const merged = structuredClone(target);

  for (const [key, value] of Object.entries(existing)) {
    const isPresentation = key.startsWith("s_") || PRESENTATION_PROPS.has(key);
    if (!isPresentation) {
      merged[key] = mergeBusinessValue(target[key], value);
      continue;
    }

    // A user-uploaded hero/cover image is content worth preserving. Template
    // artwork is identified by equality with the hydrated source preset and
    // is therefore replaced by the target template's artwork.
    if (
      USER_REPLACEABLE_MEDIA.has(key) &&
      sourceDefaults &&
      !sameValue(value, sourceDefaults[key])
    ) {
      merged[key] = structuredClone(value);
    }
  }

  return merged;
}

/**
 * Recompose an existing invitation with a catalog template without replacing
 * its business content. Target variants, layout and decoration win; matching
 * existing sections keep their identity and content. Existing section types
 * absent from the target are appended so the operation is non-destructive.
 */
export function mergeInvitationIntoTemplate(
  existingSections: readonly SectionData[],
  sourceTemplate: TemplatePreset,
  targetTemplate: TemplatePreset,
): SectionData[] {
  const existingByType = new Map<
    string,
    { section: SectionData; typeIndex: number }[]
  >();
  const existingTypeIndexes = new Map<SectionData, number>();
  const typeCounts = new Map<string, number>();
  const orderedExisting = [...existingSections].sort(
    (a, b) => a.order - b.order,
  );

  for (const section of orderedExisting) {
    const typeIndex = typeCounts.get(section.type) ?? 0;
    typeCounts.set(section.type, typeIndex + 1);
    existingTypeIndexes.set(section, typeIndex);
    const queue = existingByType.get(section.type) ?? [];
    queue.push({ section, typeIndex });
    existingByType.set(section.type, queue);
  }

  const sourceByType = new Map<string, SectionData[]>();
  for (const section of hydrateTemplateSections(sourceTemplate)) {
    const queue = sourceByType.get(section.type) ?? [];
    queue.push(section);
    sourceByType.set(section.type, queue);
  }

  const usedSections = new Set<SectionData>();
  const nextExistingIndexByType = new Map<string, number>();
  const usedIds = new Set<string>();
  const uniqueId = (preferred?: string) => {
    if (preferred && !usedIds.has(preferred)) {
      usedIds.add(preferred);
      return preferred;
    }
    let id = crypto.randomUUID();
    while (usedIds.has(id)) id = crypto.randomUUID();
    usedIds.add(id);
    return id;
  };

  const merged = hydrateTemplateSections(targetTemplate).map((target) => {
    const typeIndex = nextExistingIndexByType.get(target.type) ?? 0;
    const match = existingByType.get(target.type)?.[typeIndex];
    if (!match) {
      return { ...target, id: uniqueId() };
    }

    nextExistingIndexByType.set(target.type, typeIndex + 1);
    usedSections.add(match.section);
    const sourceDefaults = sourceByType.get(target.type)?.[match.typeIndex]
      ?.props;
    return {
      ...target,
      id: uniqueId(match.section.id),
      visible: match.section.visible,
      props: mergeSectionContent(
        target.props,
        match.section.props,
        sourceDefaults,
      ),
    };
  });

  for (const section of orderedExisting) {
    if (usedSections.has(section)) continue;
    const typeIndex = existingTypeIndexes.get(section) ?? 0;
    const sourceDefaults = sourceByType.get(section.type)?.[typeIndex]?.props;
    const standardVariant =
      targetTemplate.composition !== "cinematic" &&
      section.variant === CINEMATIC_VARIANT
        ? Object.keys(SectionRegistry[section.type]?.variants ?? {}).find(
            (variant) => variant !== CINEMATIC_VARIANT,
          )
        : undefined;

    if (standardVariant) {
      merged.push({
        ...structuredClone(section),
        id: uniqueId(section.id),
        variant: standardVariant,
        props: mergeSectionContent(
          variantDefaultProps(section.type, standardVariant),
          section.props,
          sourceDefaults,
        ),
        style_overrides: undefined,
      });
      continue;
    }

    merged.push({
      ...structuredClone(section),
      id: uniqueId(section.id),
    });
  }

  return merged.map((section, order) => ({ ...section, order }));
}
