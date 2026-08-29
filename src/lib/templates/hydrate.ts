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
  v == null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0);

export function hydrateTemplateSections(
  t: TemplatePreset,
): (Omit<SectionData, "id"> & { id: string })[] {
  return t.sections.map((s, i) => {
    const defaults = variantDefaultProps(s.type, s.variant);
    const props: Record<string, unknown> = { ...defaults };
    // preset overrides win, but an empty override keeps the (dummy) default
    for (const [k, v] of Object.entries(s.props)) {
      if (isEmpty(v) && !isEmpty(defaults[k])) continue;
      props[k] = v;
    }
    return { ...s, id: `t-${i}`, props };
  });
}
