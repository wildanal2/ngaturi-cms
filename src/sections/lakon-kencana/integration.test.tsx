import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getTemplate,
  TEMPLATES,
  resolveTemplateComposition,
} from "@/lib/templates/catalog";
import {
  hydrateTemplateSections,
  mergeInvitationIntoTemplate,
} from "@/lib/templates/hydrate";
import { getCompositionPolicy } from "@/lib/templates/composition-policy";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { getVariant } from "../registry";
import { useBuilder } from "@/stores/builder-store";
import type { SectionData } from "../types";
import {
  dateLabel,
  externalUrl,
  guestLimit,
  hasLakonContent,
  lakonCalendarUrl,
  lakonTimeRange,
  primaryLakonEvent,
  splitNames,
  targetTimestamp,
} from "./data";
import { formatTimeRange } from "../shared";

import loadable from "next/dist/shared/lib/loadable.shared-runtime";

// Next preloads SSR dynamic modules before rendering a page.
beforeAll(async () => {
  await loadable.preloadAll();
});

it("keeps the shared WIB display contract without a runtime theme import", () => {
  for (const [start, end] of [
    [undefined, undefined],
    ["", "10:00"],
    ["08:00", undefined],
    ["08:00", "10:00"],
  ]) {
    expect(lakonTimeRange(start, end)).toBe(formatTimeRange(start, end));
  }
});

const template = getTemplate("lakon-kencana")!;
const fixture = () => hydrateTemplateSections(template);
const render = (sections: SectionData[]) =>
  renderToStaticMarkup(
    <InvitationRenderer
      sections={sections}
      global={template.global_settings}
      composition="standard"
      isPreview
    />,
  );

describe("Lakon Kencana integration", () => {
  it("leaves existing public renderer branches free of Lakon styling, chrome and demo assets", () => {
    for (const id of [
      "gerbang-puspa",
      "cinematic-vintage",
      "sage-emas-klasik",
    ]) {
      const legacy = getTemplate(id)!;
      const sections = hydrateTemplateSections(legacy);
      const before = structuredClone(sections);
      const html = renderToStaticMarkup(
        <InvitationRenderer
          sections={sections}
          global={legacy.global_settings}
          composition={resolveTemplateComposition(id)}
          isPreview
        />,
      );
      expect(html, id).not.toContain("data-lakon-");
      expect(html, id).not.toContain("/themes/lakon-kencana/");
      expect(sections, id).toEqual(before);
    }
  });
  it("has its own stable catalog identity and freely editable standard sections", () => {
    expect(TEMPLATES.filter((t) => t.id === template.id)).toHaveLength(1);
    expect(template).toMatchObject({
      name: "Lakon Kencana",
      category: "wedding",
      tier: "premium",
      composition: "standard",
      thumbnail: "/templates/lakon-kencana/card",
    });
    expect(resolveTemplateComposition(template.id)).toBe("standard");
    expect(getCompositionPolicy({ composition: "standard" })).toMatchObject({
      canEditCoreVariant: true,
      canReorderCoreSection: true,
    });
    for (const section of fixture())
      expect(
        getVariant(section.type, section.variant)?.propsSchema.safeParse(
          section.props,
        ).success,
        section.type,
      ).toBe(true);
  });
  it("has no duplicate chapters and closes the actual default content flow", () => {
    const sections = fixture();
    const visible = sections.filter(
      (s) =>
        s.visible &&
        !["loading", "cover", "music", "navigation"].includes(s.type),
    );
    expect(visible.map((s) => s.type)).toEqual([
      "hero",
      "couple-intro",
      "story",
      "event-details",
      "countdown",
      "gallery",
      "rsvp",
      "guestbook",
      "closing",
    ]);
    expect(sections.find((s) => s.type === "gift")).toMatchObject({
      visible: false,
      props: { bank_accounts: [] },
    });
    expect(
      sections.find((s) => s.type === "map-location")?.props.maps_url,
    ).toBe("");
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
  });
  it("protects background content in server HTML and keeps absent music out", () => {
    const html = render(fixture());
    expect(html).toMatch(/data-section="hero"[^>]*inert=""/);
    expect(html).toContain("data-lakon-cover");
    expect(html).toContain("Tamu Undangan");
    expect(html).toMatch(/data-lakon-navigation[^>]*hidden=""[^>]*inert=""/);
    expect(html).not.toContain("data-lakon-music");
    expect(html).not.toContain("data-cinematic-stage");
    expect(html).not.toContain("data-gerbang-puspa");
  });
  it("renders enabled repeated instances in authored order without mutating stored data", () => {
    const sections = fixture();
    const gallery = sections.find((s) => s.type === "gallery")!;
    sections.push({
      ...structuredClone(gallery),
      id: "authored-gallery-2",
      order: 4,
    });
    const snapshot = structuredClone(sections);
    const html = render(sections);
    expect(html.match(/data-lakon-scene="gallery"/g)).toHaveLength(2);
    expect(html.indexOf('data-section-id="authored-gallery-2"')).toBeLessThan(
      html.indexOf('data-lakon-scene="story"'),
    );
    expect(sections).toEqual(snapshot);
  });
  it("removes empty optional chapters completely", () => {
    const sections = fixture();
    for (const section of sections) {
      if (
        [
          "story",
          "gallery",
          "gift",
          "quote",
          "map-location",
          "event-details",
        ].includes(section.type)
      ) {
        section.visible = true;
        section.props = {
          items: [],
          images: [],
          bank_accounts: [],
          events: [],
          text: "",
        };
      }
    }
    const html = render(sections);
    for (const type of [
      "story",
      "gallery",
      "gift",
      "quote",
      "map-location",
      "event-details",
    ])
      expect(html).not.toContain(`data-lakon-scene="${type}"`);
  });
  it("uses the actual first enabled event for display, countdown and calendar", () => {
    const sections = fixture();
    const event = sections.find((s) => s.type === "event-details")!;
    event.props.events = [
      {
        name: "Acara Kedua",
        date: "2027-01-10T23:00:00Z",
        start_time: "08:30",
        end_time: "10:00",
        venue_name: "Venue pengguna",
        address: "Alamat pengguna",
      },
    ];
    const primary = primaryLakonEvent(sections)!;
    expect(targetTimestamp(primary.date, primary.start_time)).toBe(
      Date.parse("2027-01-11T01:30:00Z"),
    );
    expect(dateLabel(primary.date)).toContain("11 Januari 2027");
    const url = new URL(lakonCalendarUrl(primary));
    expect(url.searchParams.get("dates")).toBe(
      "20270111T083000/20270111T100000",
    );
    expect(url.searchParams.get("ctz")).toBe("Asia/Jakarta");
    event.visible = false;
    expect(primaryLakonEvent(sections)).toBeUndefined();
  });
  it("does not offer a calendar action with an incomplete or reversed time range", () => {
    const sections = fixture();
    const event = sections.find((s) => s.type === "event-details")!;
    event.props.events = [
      {
        name: "Akad",
        date: "2027-06-19",
        start_time: "08:00",
        venue_name: "Tempat pengguna",
      },
      {
        name: "Resepsi",
        date: "2027-06-19",
        start_time: "15:00",
        end_time: "13:00",
        venue_name: "Tempat pengguna",
      },
    ];
    expect(render(sections)).not.toContain("calendar/render?");
  });
  it("preserves all authored content, media, hidden state and section IDs when switching", () => {
    const source = getTemplate("gerbang-puspa")!;
    const sections = hydrateTemplateSections(source);
    for (const section of sections) {
      section.id = `user-${section.id}`;
      if (section.type === "cover")
        section.props.names = "Raden Dan Kusuma & Ayu";
      if (section.type === "hero") {
        section.props.couple_names = "Raden Dan Kusuma & Ayu";
        section.props.background_image = "/uploads/owned.webp";
      }
      if (section.type === "couple-intro") {
        section.props.groom = { name: "Dan", full_name: "Raden Dan Kusuma" };
        section.props.bride = { name: "Ayu", full_name: "Ayu Pertiwi" };
      }
      if (section.type === "gallery") {
        section.props.images = [];
        section.visible = false;
      }
    }
    const snapshot = structuredClone(sections);
    const merged = mergeInvitationIntoTemplate(sections, source, template);
    expect(merged.find((s) => s.type === "hero")).toMatchObject({
      id: sections.find((s) => s.type === "hero")!.id,
      props: {
        couple_names: "Raden Dan Kusuma & Ayu",
        background_image: "/uploads/owned.webp",
      },
    });
    expect(merged.find((s) => s.type === "couple-intro")?.props).toMatchObject({
      groom: { name: "Dan", full_name: "Raden Dan Kusuma" },
      bride: { name: "Ayu", full_name: "Ayu Pertiwi" },
    });
    expect(merged.find((s) => s.type === "gallery")).toMatchObject({
      visible: false,
      props: { images: [] },
    });
    expect(sections).toEqual(snapshot);
  });
  it("does not introduce sample identities or fabricated events into a source lacking those sections", () => {
    const source = getTemplate("sage-emas-klasik")!;
    const sections: SectionData[] = [
      {
        id: "user-hero",
        type: "hero",
        variant: "centered",
        order: 0,
        visible: true,
        props: {
          couple_names: "Alya & Ilham",
          event_date: "2027-11-12",
          background_image: "/uploads/hero.webp",
        },
      },
    ];
    const merged = mergeInvitationIntoTemplate(sections, source, template);
    expect(merged.find((s) => s.type === "cover")?.props.names).toBe(
      "Alya & Ilham",
    );
    expect(merged.find((s) => s.type === "closing")?.props.names).toBe(
      "Alya & Ilham",
    );
    for (const type of [
      "couple-intro",
      "story",
      "gallery",
      "event-details",
      "quote",
    ])
      expect(merged.find((s) => s.type === type)?.visible, type).toBe(false);
    expect(merged.find((s) => s.type === "countdown")?.props.target_date).toBe(
      "2027-11-12",
    );
    expect(JSON.stringify(merged)).not.toContain("Bagas");
    expect(JSON.stringify(merged)).not.toContain("Sekar");
  });
  it("keeps Canvas edits, visibility and reordering in the existing Builder store", () => {
    const store = useBuilder;
    store.getState().load({
      invitationId: "local-fixture",
      sections: fixture(),
      global: template.global_settings,
      locked: false,
      premiumFeatures: true,
      compositionPolicy: getCompositionPolicy({ composition: "standard" }),
    });
    const section = store.getState().sections.find((s) => s.type === "hero")!;
    store.getState().setProp(section.id, "couple_names", "Anindya & Aditya");
    expect(store.getState().dirty).toBe(true);
    expect(
      store.getState().sections.find((s) => s.id === section.id)?.props
        .couple_names,
    ).toBe("Anindya & Aditya");
    store.getState().toggleVisible(section.id);
    expect(
      store.getState().sections.find((s) => s.id === section.id)?.visible,
    ).toBe(false);
    const closing = store
      .getState()
      .sections.find((s) => s.type === "closing")!;
    store.getState().reorder(closing.id, section.id);
    expect(
      store.getState().sections.find((s) => s.id === closing.id)!.order,
    ).toBeLessThan(
      store.getState().sections.find((s) => s.id === section.id)!.order,
    );
  });
});
describe("Lakon data boundaries", () => {
  it("keeps names containing Dan intact", () =>
    expect(splitNames("Raden Dan Kusuma & Sekar Ayu")).toEqual([
      "Raden Dan Kusuma",
      "Sekar Ayu",
    ]));
  it("has explicit WIB parsing and invalid-date fallback", () => {
    expect(targetTimestamp("2027-06-19T08:00")).toBe(
      Date.parse("2027-06-19T01:00Z"),
    );
    expect(targetTimestamp("2027-06-19")).toBe(Date.parse("2027-06-18T17:00Z"));
    expect(dateLabel("nonsense")).toBe("");
    expect(Number.isNaN(targetTimestamp(""))).toBe(true);
  });
  it.each([
    [undefined, 2],
    ["5", 5],
    [99, 20],
    [-4, 1],
    ["invalid", 2],
  ])("bounds RSVP guest count %s to %s", (input, expected) =>
    expect(guestLimit(input)).toBe(expected),
  );
  it("never treats unsafe links or empty media as rendered destinations", () => {
    expect(externalUrl("javascript:alert(1)")).toBe("");
    expect(
      hasLakonContent("gallery", { images: [{ url: "javascript:alert(1)" }] }),
    ).toBe(false);
    expect(hasLakonContent("gift", { bank_accounts: [] })).toBe(false);
    expect(hasLakonContent("map-location", { maps_url: "javascript:x" })).toBe(
      false,
    );
  });
});
