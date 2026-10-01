import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { presentationModeLabel } from "@/components/builder/theme-panel";
import { getBuilderFlow } from "@/components/builder/canvas";
import { getDevice } from "@/components/builder/devices";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { DeviceFrame } from "@/components/builder/device-frame";
import { CinematicComposition } from "@/sections/cinematic/composition";
import { SekarJawa3DComposition } from "./composition";

const sekarTemplate = getTemplate("sekar-jawa-3d")!;

describe("Sekar Jawa 3D Builder integration", () => {
  it("contains one immersive Canvas inside the DeviceFrame preview", () => {
    const markup = renderToStaticMarkup(
      <DeviceFrame preset={getDevice("galaxy-s25")}>
        <SekarJawa3DComposition
          sections={hydrateTemplateSections(sekarTemplate)}
          global={sekarTemplate.global_settings}
          inCanvas
          isPreview
        />
      </DeviceFrame>,
    );

    expect(markup).toContain("data-device-scroller");
    expect(markup).toContain('data-sekar-jawa-3d-stage="true"');
    expect(markup).toContain('data-in-canvas="true"');
    expect(markup.match(/data-sekar-jawa-3d-canvas/g)).toHaveLength(1);
  });

  it("renders a linear styled invitation with no immersive Canvas in Simple mode", () => {
    const global = {
      ...structuredClone(sekarTemplate.global_settings),
      presentationMode: "simple" as const,
    };
    const markup = renderToStaticMarkup(
      <SekarJawa3DComposition
        sections={hydrateTemplateSections(sekarTemplate)}
        global={global}
        inCanvas
        isPreview
      />,
    );

    expect(markup).toContain("data-sekar-jawa-3d-simple");
    expect(markup).toContain('data-presentation-mode="simple"');
    expect(markup).not.toContain("data-sekar-jawa-3d-canvas");
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
    const global = structuredClone(sekarTemplate.global_settings);
    expect(global.presentationMode).toBe("cinematic");

    const markup = renderToStaticMarkup(
      <SekarJawa3DComposition
        sections={hydrateTemplateSections(sekarTemplate)}
        global={global}
      />,
    );

    expect(markup).toContain('data-presentation-mode="cinematic"');
    expect(global.presentationMode).toBe("cinematic");
  });

  it("uses Sekar Jawa 3D labels without changing Cinematic Vintage labels", () => {
    expect(presentationModeLabel("sekar-jawa-3d", "cinematic")).toBe(
      "Imersif",
    );
    expect(presentationModeLabel("sekar-jawa-3d", "simple")).toBe(
      "Sederhana",
    );
    expect(presentationModeLabel("cinematic-vintage", "cinematic")).toBe(
      "Sinematik",
    );
  });

  it("settles each Builder composition without retaining stale runtimes", () => {
    const sekar = renderToStaticMarkup(
      <SekarJawa3DComposition
        sections={hydrateTemplateSections(sekarTemplate)}
        global={sekarTemplate.global_settings}
        inCanvas
      />,
    );
    expect(sekar.match(/data-sekar-jawa-3d-canvas/g)).toHaveLength(1);
    expect(sekar).not.toContain("data-cinematic-stage");

    const cinematicTemplate = getTemplate("cinematic-vintage")!;
    const cinematic = renderToStaticMarkup(
      <CinematicComposition
        sections={hydrateTemplateSections(cinematicTemplate)}
        global={cinematicTemplate.global_settings}
        inCanvas
      />,
    );
    expect(cinematic).toContain("data-cinematic-stage");
    expect(cinematic).not.toContain("data-sekar-jawa-3d-stage");
  });

  it("keeps the Standard Builder flow unchanged", () => {
    const standardTemplate = getTemplate("sage-emas-klasik")!;
    const standardSections = hydrateTemplateSections(standardTemplate);
    expect(getBuilderFlow(standardSections, "standard")).toBe(standardSections);
  });
});
