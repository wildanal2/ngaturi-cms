import { describe, expect, it } from "vitest";
import {
  SectionRegistry,
  getAllSections,
  getSectionsByCategory,
  getVariant,
  variantDefaultProps,
} from "./registry";

const CATEGORIES = new Set(["hero", "content", "interactive", "footer"]);

describe("SectionRegistry", () => {
  it("keys its entries by their own type", () => {
    for (const [key, def] of Object.entries(SectionRegistry)) {
      expect(def.type).toBe(key);
    }
  });

  it("every section has usable metadata", () => {
    for (const def of getAllSections()) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.icon).toBeTruthy();
      expect(CATEGORIES.has(def.category)).toBe(true);
      expect(Object.keys(def.variants).length).toBeGreaterThan(0);
    }
  });

  describe.each(getAllSections())("$type", (def) => {
    it.each(Object.entries(def.variants))("variant %s is well-formed", (key, v) => {
      expect(typeof v.component).toBe("function");
      expect(v.propsSchema).toBeDefined();
      expect(Array.isArray(v.fields)).toBe(true);
      expect(v.defaultProps).toBeTypeOf("object");

      // default props (incl. injected style + dummy values) must satisfy the schema
      const props = variantDefaultProps(def.type, key);
      const parsed = v.propsSchema.safeParse(props);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

      // every styleOption default lands on props as s_<key>
      for (const so of v.styleOptions ?? []) {
        expect(props[`s_${so.key}`]).toBe(so.default);
      }
    });
  });

  it("getVariant returns undefined for unknown type/variant", () => {
    expect(getVariant("nope", "nope")).toBeUndefined();
    expect(getVariant("hero", "nope")).toBeUndefined();
  });

  it("getSectionsByCategory covers every section exactly once", () => {
    const grouped = getSectionsByCategory().flatMap((g) => g.sections);
    expect(grouped).toHaveLength(getAllSections().length);
    expect(new Set(grouped.map((s) => s.type)).size).toBe(grouped.length);
  });
});
