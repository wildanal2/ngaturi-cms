import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getTemplate, TEMPLATES } from "@/lib/templates/catalog";
import { getCompositionPolicy } from "@/lib/templates/composition-policy";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { CompositionSchema } from "../schema";
import { getVariant } from "../registry";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { useBuilder } from "@/stores/builder-store";
import { cinematicContent, isCinematicComposition } from "./content";
import { CinematicComposition } from "./composition";

const template = getTemplate("cinematic-vintage")!;
const sections = () => hydrateTemplateSections(template);

describe("Cinematic Vintage contract", () => {
  it("reads replacement photos from section props and never hardcodes couple artwork", () => {
    const hydrated = sections();
    hydrated.find((s) => s.type === "hero")!.props.background_image =
      "/user-hero.jpg";
    hydrated.find((s) => s.type === "gallery")!.props.images = [
      { url: "/user-gallery.jpg", caption: "Kenangan" },
    ];
    hydrated.find((s) => s.type === "closing")!.props.photo =
      "/user-closing.jpg";
    const markup = renderToStaticMarkup(
      <CinematicComposition
        sections={hydrated}
        global={template.global_settings}
      />,
    );
    for (const image of [
      "user-hero.jpg",
      "user-gallery.jpg",
      "user-closing.jpg",
    ])
      expect(markup).toContain(image);
  });
  it("is a premium wedding preset using the official card route and composition schema", () => {
    expect(template).toMatchObject({
      category: "wedding",
      tier: "premium",
      thumbnail: "/templates/cinematic-vintage/card",
    });
    expect(
      CompositionSchema.safeParse({
        global_settings: template.global_settings,
        sections: sections(),
      }).success,
    ).toBe(true);
  });

  it("hydrates two independent, editable event records and no cinematic section types", () => {
    const hydrated = sections();
    expect(
      hydrated.find((s) => s.type === "event-details")?.props.events,
    ).toEqual([
      expect.objectContaining({
        name: "Akad Nikah",
        date: expect.any(String),
        venue_name: expect.any(String),
      }),
      expect.objectContaining({
        name: "Resepsi",
        date: expect.any(String),
        venue_name: expect.any(String),
      }),
    ]);
    for (const section of hydrated) {
      expect(section.type.startsWith("cinematic-")).toBe(false);
      expect(
        getVariant(section.type, section.variant)?.propsSchema.safeParse(
          section.props,
        ).success,
      ).toBe(true);
    }
  });

  it("keeps source references, takes visible variants only and preserves additional sections", () => {
    const hydrated = sections();
    const hero = hydrated.find((s) => s.type === "hero")!;
    const quote = hydrated.find((s) => s.type === "quote")!;
    const gallery = hydrated.find((s) => s.type === "gallery")!;
    quote.visible = false;
    gallery.variant = "grid";
    const duplicate = { ...hero, id: "duplicate", order: 20 };
    const content = cinematicContent([...hydrated, duplicate]);
    expect(content.core.hero).toBe(hero);
    expect(content.core.quote).toBeUndefined();
    expect(content.core.gallery).toBeUndefined();
    expect(content.remaining).toContain(gallery);
    expect(content.remaining).toContain(duplicate);
    expect(content.remaining.map((s) => s.type)).toEqual(
      expect.arrayContaining([
        "countdown",
        "rsvp",
        "gift",
        "guestbook",
        "music",
        "navigation",
        "cover",
      ]),
    );
  });

  it("does not opt standard templates into orchestration", () => {
    for (const standard of TEMPLATES.filter((t) => t.id !== template.id)) {
      const hydrated = hydrateTemplateSections(standard);
      expect(isCinematicComposition(hydrated)).toBe(false);
      expect(cinematicContent(hydrated).core).toEqual({});
    }
    const hydrated = sections();
    hydrated.find((s) => s.type === "hero")!.visible = false;
    expect(isCinematicComposition(hydrated)).toBe(false);
  });

  it("renders readable ordered DOM before GSAP is loaded, including both event CTAs", () => {
    const markup = renderToStaticMarkup(
      <CinematicComposition
        sections={sections()}
        global={template.global_settings}
      />,
    );
    expect(markup).not.toContain("data-enhanced");
    expect(markup).not.toContain('inert=""');
    expect(markup).toContain("Akad Nikah");
    expect(markup).toContain("Resepsi");
    expect(markup.match(/data-event-portal=/g)).toHaveLength(2);
    expect(markup.match(/Buka Google Maps/g)).toHaveLength(3);
    const sceneNames = [...markup.matchAll(/data-scene="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(sceneNames).toEqual([
      "entrance",
      "couple",
      "quote",
      "world",
      "venue",
      "closing",
    ]);
  });

  it("uses current Builder data without refilling deliberately cleared fields", () => {
    useBuilder.getState().load({
      invitationId: "test",
      sections: sections(),
      global: template.global_settings,
      locked: false,
      compositionPolicy: getCompositionPolicy({
        composition: template.composition ?? "standard",
      }),
    });
    const byType = (type: string) =>
      useBuilder.getState().sections.find((s) => s.type === type)!;
    useBuilder
      .getState()
      .setProp(byType("hero").id, "couple_names", "Alya & Bima");
    useBuilder
      .getState()
      .setProp(byType("couple-intro").id, "bride.full_name", "Alya Putri");
    useBuilder
      .getState()
      .setProp(byType("quote").id, "text", "Kisah baru kami");
    useBuilder
      .getState()
      .setProp(byType("event-details").id, "events.1.name", "Resepsi Sore");
    useBuilder
      .getState()
      .setProp(byType("map-location").id, "venue_name", "Taman Kenangan");
    useBuilder.getState().setProp(byType("gallery").id, "images", []);
    useBuilder
      .getState()
      .setProp(byType("closing").id, "message", "Terima kasih semuanya");
    const current = useBuilder.getState();
    const markup = renderToStaticMarkup(
      <CinematicComposition
        sections={current.sections}
        global={current.global}
        inCanvas
      />,
    );
    for (const text of [
      "Alya &amp; Bima",
      "Alya Putri",
      "Kisah baru kami",
      "Resepsi Sore",
      "Taman Kenangan",
      "Terima kasih semuanya",
    ])
      expect(markup).toContain(text);
    expect(
      cinematicContent(current.sections).core.gallery?.props.images,
    ).toEqual([]);
    expect(markup).toContain('data-in-canvas="true"');
  });

  it("guards cinematic presentation mutations while keeping content and functional order editable", () => {
    const hydrated = sections();
    useBuilder.getState().load({
      invitationId: "policy-guard",
      sections: hydrated,
      global: template.global_settings,
      locked: false,
      compositionPolicy: getCompositionPolicy({
        composition: template.composition ?? "standard",
      }),
    });
    const byType = (type: string) =>
      useBuilder.getState().sections.find((section) => section.type === type)!;
    const hero = byType("hero");
    const rsvp = byType("rsvp");
    const guestbook = byType("guestbook");
    const originalOrder = useBuilder.getState().sections.map((s) => s.id);

    useBuilder.getState().setVariant(hero.id, "minimal");
    useBuilder.getState().setGlobal({ animation: "zoom" });
    useBuilder.getState().reorder(hero.id, rsvp.id);

    expect(byType("hero").variant).toBe("cinematic-vintage");
    expect(useBuilder.getState().global.animation).toBe("none");
    expect(useBuilder.getState().sections.map((s) => s.id)).toEqual(
      originalOrder,
    );

    useBuilder.getState().setProp(hero.id, "couple_names", "Isi tetap bebas");
    expect(byType("hero").props.couple_names).toBe("Isi tetap bebas");

    useBuilder.getState().reorder(rsvp.id, guestbook.id);
    expect(useBuilder.getState().sections.indexOf(byType("rsvp"))).toBeGreaterThan(
      useBuilder.getState().sections.indexOf(byType("guestbook")),
    );
  });

  it("keeps the standard renderer on its existing section path", () => {
    const standard = sections().map((s) =>
      s.type === "hero" ? { ...s, variant: "minimal" } : s,
    );
    const markup = renderToStaticMarkup(
      <InvitationRenderer
        sections={standard}
        global={template.global_settings}
        composition="standard"
        isPreview
      />,
    );
    expect(markup).not.toContain("data-cinematic-stage");
  });

  it("handles empty optional fields and arbitrary event counts without creating defaults", () => {
    const empty = sections().map((s) => ({ ...s, props: {} }));
    expect(() =>
      renderToStaticMarkup(
        <CinematicComposition
          sections={empty}
          global={template.global_settings}
        />,
      ),
    ).not.toThrow();
    const hydrated = sections();
    hydrated.find((s) => s.type === "event-details")!.props.events = [];
    const markup = renderToStaticMarkup(
      <CinematicComposition
        sections={hydrated}
        global={template.global_settings}
      />,
    );
    expect(markup).not.toContain("data-event-portal=");
  });
});
