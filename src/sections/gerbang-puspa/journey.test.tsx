import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import type { SectionData } from "../types";
import {
  gerbangActiveTarget,
  gerbangNavigationEnabled,
  gerbangNavigationTargets,
} from "./navigation-data";

const template = getTemplate("gerbang-puspa")!;
const fixture = () => hydrateTemplateSections(template);
const render = (sections: SectionData[]) =>
  renderToStaticMarkup(
    <InvitationRenderer
      sections={sections}
      global={template.global_settings}
      composition="standard"
    />,
  );

describe("Gerbang Puspa native journey", () => {
  it("starts with protected content and one hidden, inert dock in server HTML", () => {
    const sections = fixture();
    sections.push(
      ...["bar", "dock"].map((variant, i) => ({
        id: `authored-nav-${i}`,
        type: "navigation",
        variant,
        order: 20 + i,
        visible: true,
        props: {},
      })),
    );
    const html = render(sections);
    expect(html.match(/data-gp-navigation=/g)).toHaveLength(1);
    expect(html).toMatch(
      /<nav[^>]*data-gp-navigation[^>]*hidden=""[^>]*inert=""/,
    );
    expect(html).toMatch(/data-section="hero"[^>]*inert=""/);
    expect(html).not.toContain("Hitung Mundur</button>");
    expect(html).not.toContain("data-gerbang-puspa-music");
  });
  it("keeps authored duplicate content and stable identities, without renderer injection", () => {
    const sections = fixture();
    const gallery = sections.find((s) => s.type === "gallery")!;
    sections.push({
      ...structuredClone(gallery),
      id: "authored-extra-gallery",
      order: 20,
    });
    const before = structuredClone(sections);
    const html = render(sections);
    expect(html.match(/data-section="gallery"/g)).toHaveLength(2);
    expect(
      html.match(/data-section-id="authored-extra-gallery"/g),
    ).toHaveLength(1);
    expect(sections).toEqual(before);
  });
  it("has one default gallery, optional unpopulated Story and Closing as final content", () => {
    const sections = fixture();
    expect(sections.filter((s) => s.type === "gallery")).toHaveLength(1);
    expect(sections.find((s) => s.type === "story")).toMatchObject({
      visible: false,
      props: { items: [] },
    });
    expect(
      sections
        .filter(
          (s) =>
            s.visible !== false &&
            !["loading", "cover", "music", "navigation"].includes(s.type),
        )
        .at(-1)?.type,
    ).toBe("closing");
    expect(sections.findIndex((s) => s.type === "countdown")).toBeLessThan(
      sections.findIndex((s) => s.type === "event-details"),
    );
  });
  it("derives available targets and RSVP ownership with missing and reordered sections", () => {
    const sections = fixture();
    const rsvp = sections.find((s) => s.type === "rsvp")!;
    rsvp.order = 2.5;
    const gallery = sections.find((s) => s.type === "gallery")!;
    gallery.props.images = [];
    sections.find((s) => s.type === "couple-intro")!.visible = false;
    const events = sections.find((s) => s.type === "event-details")!;
    events.order = 2.2;
    const targets = gerbangNavigationTargets(sections);
    expect(targets.map((t) => t.label)).toEqual(["Beranda", "Acara", "RSVP"]);
    expect(targets.find((t) => t.key === "events")?.sectionId).toBe(events.id);
    expect(targets.find((t) => t.key === "rsvp")?.sectionId).toBe(rsvp.id);
    rsvp.visible = false;
    expect(
      gerbangNavigationTargets(sections).some((t) => t.key === "rsvp"),
    ).toBe(false);
  });
  it("respects an explicitly hidden dock and tracks actual geometry instead of preset order", () => {
    const sections = fixture();
    expect(gerbangNavigationEnabled(sections)).toBe(true);
    sections.find((section) => section.type === "navigation")!.visible = false;
    expect(gerbangNavigationEnabled(sections)).toBe(false);
    expect(
      gerbangActiveTarget(
        [
          { key: "events", top: -100 },
          { key: "home", top: -900 },
          { key: "rsvp", top: 500 },
        ],
        200,
      ),
    ).toBe("events");
    expect(
      gerbangActiveTarget(
        [
          { key: "gallery", top: -100 },
          { key: "events", top: 600 },
        ],
        200,
      ),
    ).toBe("gallery");
    expect(
      gerbangActiveTarget(
        [
          { key: "events", top: -1000 },
          { key: "", top: -100 },
          { key: "gallery", top: 500 },
        ],
        200,
      ),
    ).toBe("");
  });
});
