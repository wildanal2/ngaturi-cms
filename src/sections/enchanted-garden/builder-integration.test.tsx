import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { presentationModeLabel } from "@/components/builder/theme-panel";
import { getBuilderFlow } from "@/components/builder/canvas";
import { getDevice } from "@/components/builder/devices";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { DeviceFrame } from "@/components/builder/device-frame";
import { CinematicComposition } from "@/sections/cinematic/composition";
import { EnchantedGardenComposition } from "./composition";

const enchantedTemplate = getTemplate("enchanted-garden")!;

describe("Enchanted Garden Builder integration", () => {
  it("contains one immersive Canvas inside the DeviceFrame preview", () => {
    const markup = renderToStaticMarkup(
      <DeviceFrame preset={getDevice("galaxy-s25")}>
        <EnchantedGardenComposition
          sections={hydrateTemplateSections(enchantedTemplate)}
          global={enchantedTemplate.global_settings}
          inCanvas
          isPreview
        />
      </DeviceFrame>,
    );

    expect(markup).toContain("data-device-scroller");
    expect(markup).toContain('data-enchanted-garden-stage="true"');
    expect(markup).toContain('data-in-canvas="true"');
    expect(markup.match(/data-enchanted-garden-canvas/g)).toHaveLength(1);
  });

  it("renders a linear styled invitation with no immersive Canvas in Simple mode", () => {
    const global = {
      ...structuredClone(enchantedTemplate.global_settings),
      presentationMode: "simple" as const,
    };
    const markup = renderToStaticMarkup(
      <EnchantedGardenComposition
        sections={hydrateTemplateSections(enchantedTemplate)}
        global={global}
        inCanvas
        isPreview
      />,
    );

    expect(markup).toContain("data-enchanted-garden-simple");
    expect(markup).toContain('data-presentation-mode="simple"');
    expect(markup).not.toContain("data-enchanted-garden-canvas");
    for (const type of [
      "hero",
      "event-details",
      "rsvp",
      "guestbook",
      "gift",
      "closing",
    ]) {
      expect(markup).toContain(`data-section="${type}"`);
    }
  });

  it("keeps reduced-motion runtime handling separate from the saved mode", () => {
    const global = structuredClone(enchantedTemplate.global_settings);
    expect(global.presentationMode).toBe("cinematic");

    const markup = renderToStaticMarkup(
      <EnchantedGardenComposition
        sections={hydrateTemplateSections(enchantedTemplate)}
        global={global}
      />,
    );

    expect(markup).toContain('data-presentation-mode="cinematic"');
    expect(global.presentationMode).toBe("cinematic");
  });

  it("uses Enchanted Garden labels without changing Cinematic Vintage labels", () => {
    expect(presentationModeLabel("enchanted-garden", "cinematic")).toBe(
      "Imersif",
    );
    expect(presentationModeLabel("enchanted-garden", "simple")).toBe(
      "Sederhana",
    );
    expect(presentationModeLabel("cinematic-vintage", "cinematic")).toBe(
      "Sinematik",
    );
  });

  it("settles each Builder composition without retaining stale runtimes", () => {
    const enchanted = renderToStaticMarkup(
      <EnchantedGardenComposition
        sections={hydrateTemplateSections(enchantedTemplate)}
        global={enchantedTemplate.global_settings}
        inCanvas
      />,
    );
    expect(enchanted.match(/data-enchanted-garden-canvas/g)).toHaveLength(1);
    expect(enchanted).not.toContain("data-cinematic-stage");

    const cinematicTemplate = getTemplate("cinematic-vintage")!;
    const cinematic = renderToStaticMarkup(
      <CinematicComposition
        sections={hydrateTemplateSections(cinematicTemplate)}
        global={cinematicTemplate.global_settings}
        inCanvas
      />,
    );
    expect(cinematic).toContain("data-cinematic-stage");
    expect(cinematic).not.toContain("data-enchanted-garden-stage");
  });

  it("keeps the Standard Builder flow unchanged", () => {
    const standardTemplate = getTemplate("sage-emas-klasik")!;
    const standardSections = hydrateTemplateSections(standardTemplate);
    expect(getBuilderFlow(standardSections, "standard")).toBe(standardSections);
  });
});
