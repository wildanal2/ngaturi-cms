import { describe, expect, it } from "vitest";
import { TEMPLATES, getTemplate, resolveTemplateComposition } from "./catalog";
import { LEGACY_SEKAR_JAWA_ID, SEKAR_JAWA_ID, templateIdentityAliases } from "./identity";
import { hydrateTemplateSections } from "./hydrate";
import { getVariant } from "@/sections/registry";

describe("TEMPLATES", () => {
  it("resolves the legacy identity to one canonical template and its native variants", () => {
    const canonical = getTemplate(SEKAR_JAWA_ID)!;
    expect(getTemplate(LEGACY_SEKAR_JAWA_ID)).toBe(canonical);
    expect(resolveTemplateComposition(LEGACY_SEKAR_JAWA_ID)).toBe(SEKAR_JAWA_ID);
    expect(TEMPLATES.some((t) => t.id === LEGACY_SEKAR_JAWA_ID)).toBe(false);
    for (const type of ["cover", "hero", "couple-intro", "event-details", "closing"]) {
      expect(getVariant(type, LEGACY_SEKAR_JAWA_ID)).toBe(getVariant(type, SEKAR_JAWA_ID));
    }
    expect(hydrateTemplateSections(getTemplate(LEGACY_SEKAR_JAWA_ID)!)).toEqual(hydrateTemplateSections(canonical));
    expect(templateIdentityAliases(LEGACY_SEKAR_JAWA_ID)).toEqual(templateIdentityAliases(SEKAR_JAWA_ID));
    expect(templateIdentityAliases("cinematic-vintage")).toEqual(["cinematic-vintage"]);
  });

  it("registers Sekar Jawa 3D as an immersive premium wedding template", () => {
    expect(getTemplate("sekar-jawa-3d")).toMatchObject({
      id: "sekar-jawa-3d",
      name: "Sekar Jawa 3D",
      category: "wedding",
      tier: "premium",
      composition: "sekar-jawa-3d",
      thumbnail: "/templates/sekar-jawa-3d/card",
      global_settings: { presentationMode: "cinematic" },
    });
  });

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
