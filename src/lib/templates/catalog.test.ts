import { describe, expect, it } from "vitest";
import { TEMPLATES, getTemplate } from "./catalog";
import { hydrateTemplateSections } from "./hydrate";
import { getVariant } from "@/sections/registry";

describe("TEMPLATES", () => {
  it("has unique ids and matching thumbnail paths", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TEMPLATES) {
      expect(t.thumbnail).toBe(`/templates/${t.id}/card`);
      expect(getTemplate(t.id)).toBe(t);
    }
  });

  describe.each(TEMPLATES)("$id", (t) => {
    it("only references section variants that exist", () => {
      for (const sec of t.sections) {
        expect(
          getVariant(sec.type, sec.variant),
          `${t.id}: unknown ${sec.type}/${sec.variant}`,
        ).toBeDefined();
      }
    });

    it("hydrates to props that satisfy each variant schema", () => {
      const hydrated = hydrateTemplateSections(t);
      for (const sec of hydrated) {
        const v = getVariant(sec.type, sec.variant)!;
        const parsed = v.propsSchema.safeParse(sec.props);
        expect(
          parsed.success,
          `${t.id} ${sec.type}/${sec.variant}: ${JSON.stringify(
            parsed.error?.issues,
          )}`,
        ).toBe(true);
      }
    });

    it("uses a known font family", () => {
      expect(["Fraunces", "Inter", "Cormorant", "Parisienne"]).toContain(
        t.global_settings.font_family,
      );
    });
  });
});
