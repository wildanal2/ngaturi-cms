import { variantDefaultProps } from "@/sections/registry";
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
