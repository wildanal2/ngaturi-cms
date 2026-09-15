import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import {
  getTemplate,
  resolveTemplateComposition,
  TEMPLATES,
  type TemplateComposition,
} from "./catalog";
import {
  canEditSectionVariant,
  canReorderSection,
  getCompositionPolicy,
} from "./composition-policy";
import { hydrateTemplateSections } from "./hydrate";

const cinematicVintage = getTemplate("cinematic-vintage")!;
const cinematicSections = () => hydrateTemplateSections(cinematicVintage);

describe("template composition identity", () => {
  it("resolves standard and Cinematic Vintage through the official catalog", () => {
    expect(resolveTemplateComposition("sage-emas-klasik")).toBe("standard");
    expect(resolveTemplateComposition("cinematic-vintage")).toBe(
      "cinematic-vintage",
    );
  });

  it("fails unknown and legacy template identities safely to standard", () => {
    expect(resolveTemplateComposition(undefined)).toBe("standard");
    expect(resolveTemplateComposition("missing-template")).toBe("standard");
    expect(resolveTemplateComposition("cinematic")).toBe("standard");
  });

  it("resolves the registered Enchanted Garden identity exactly", () => {
    const composition: TemplateComposition = "enchanted-garden";

    expect(resolveTemplateComposition("enchanted-garden")).toBe(composition);
    expect(getCompositionPolicy({ composition }).composition).toBe(
      "enchanted-garden",
    );
    expect(TEMPLATES.some((template) => template.id === composition)).toBe(
      true,
    );
  });

  it("dispatches only the exact Cinematic Vintage identity to its renderer", () => {
    const render = (composition: TemplateComposition) =>
      renderToStaticMarkup(
        <InvitationRenderer
          sections={cinematicSections()}
          global={cinematicVintage.global_settings}
          composition={composition}
          isPreview
        />,
      );

    const cinematic = render("cinematic-vintage");
    const standard = render("standard");
    const enchanted = render("enchanted-garden");

    expect(cinematic).toContain("data-cinematic-stage");
    expect(cinematic).not.toContain("data-enchanted-garden-stage");
    expect(standard).not.toContain("data-cinematic-stage");
    expect(standard).not.toContain("data-enchanted-garden-stage");
    expect(enchanted).not.toContain("data-cinematic-stage");
    expect(enchanted).toContain("data-enchanted-garden-stage");
    expect(enchanted.match(/data-enchanted-garden-canvas/g)).toHaveLength(1);
  });

  it("keeps Cinematic Vintage locks composition-specific", () => {
    const cinematicPolicy = getCompositionPolicy({
      composition: "cinematic-vintage",
    });
    const standardPolicy = getCompositionPolicy({ composition: "standard" });
    const enchantedPolicy = getCompositionPolicy({
      composition: "enchanted-garden",
    });

    expect(cinematicPolicy).not.toHaveProperty("isCinematic");
    expect(cinematicPolicy.canEditMotion).toBe(false);
    expect(canEditSectionVariant(cinematicPolicy, "hero")).toBe(false);
    expect(canReorderSection(cinematicPolicy, "hero")).toBe(false);
    expect(canEditSectionVariant(cinematicPolicy, "rsvp")).toBe(true);
    expect(canReorderSection(cinematicPolicy, "rsvp")).toBe(true);

    expect(standardPolicy.canEditMotion).toBe(true);
    expect(canEditSectionVariant(standardPolicy, "hero")).toBe(true);
    expect(canReorderSection(standardPolicy, "hero")).toBe(true);

    expect(enchantedPolicy.canEditMotion).toBe(false);
    expect(canEditSectionVariant(enchantedPolicy, "hero")).toBe(false);
    expect(canReorderSection(enchantedPolicy, "hero")).toBe(false);
    expect(canEditSectionVariant(enchantedPolicy, "story")).toBe(false);
    expect(canReorderSection(enchantedPolicy, "closing")).toBe(false);
    expect(canEditSectionVariant(enchantedPolicy, "rsvp")).toBe(true);
    expect(canReorderSection(enchantedPolicy, "gift")).toBe(true);
  });
});
