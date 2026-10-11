import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getTemplate } from "@/lib/templates/catalog";
import {
  hydrateTemplateSections,
  mergeInvitationIntoTemplate,
} from "@/lib/templates/hydrate";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { DeviceFrame } from "@/components/builder/device-frame";
import { getDevice } from "@/components/builder/devices";
import { getBuilderFlow } from "@/components/builder/canvas";
import { getVariant } from "../registry";
import { EventSerambiDelima } from "../events/event-serambi-delima";
import { QuoteSerambiDelima } from "../quote/quote-serambi-delima";
import { GiftSerambiDelima } from "../gift/gift-serambi-delima";
import { GiftProps } from "../schema";

const template = getTemplate("serambi-delima")!;
const journey = [
  "loading",
  "cover",
  "hero",
  "quote",
  "couple-intro",
  "event-details",
  "map-location",
  "countdown",
  "gallery",
  "gallery",
  "quote",
  "rsvp",
  "guestbook",
  "closing",
  "music",
];

describe("Serambi Delima integration", () => {
  it("keeps demo dates coherent and the two quote instances distinct", () => {
    const sections = hydrateTemplateSections(template);
    const date = sections.find((s) => s.type === "hero")!.props.event_date;
    expect(
      sections.find((s) => s.type === "countdown")!.props.target_date,
    ).toBe(date);
    const events = sections.find((s) => s.type === "event-details")!.props
      .events as { date: string }[];
    expect(events.every((event) => event.date === date)).toBe(true);
    const quotes = sections.filter((s) => s.type === "quote");
    expect(quotes[0].props.text).not.toEqual(quotes[1].props.text);
  });

  it("supports optional Gift accounts through the unchanged existing contract", () => {
    expect(getVariant("gift", "serambi-delima")?.propsSchema).toBe(GiftProps);
    const props = {
      intro: "Authored gift message",
      bank_accounts: [
        {
          bank_name: "Example bank",
          account_name: "Authored owner",
          account_number: "1234567890",
        },
        {
          bank_name: "Example wallet",
          account_name: "Authored owner",
          account_number: "081234567890",
        },
      ],
    };
    const before = structuredClone(props);
    const html = renderToStaticMarkup(
      <GiftSerambiDelima
        props={props}
        global={template.global_settings}
        inCanvas
      />,
    );
    expect(html.match(/<article/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Salin nomor Example bank"');
    expect(html).toContain("1234567890");
    expect(props).toEqual(before);
    expect(
      renderToStaticMarkup(
        <GiftSerambiDelima
          props={{ bank_accounts: [] }}
          global={template.global_settings}
          inCanvas
        />,
      ),
    ).toBe("");
  });

  it("hydrates the complete standard journey without sharing repeated data", () => {
    const sections = hydrateTemplateSections(template);
    expect(template.composition).toBe("standard");
    expect(sections.map((s) => s.type)).toEqual(journey);
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
    for (const section of sections)
      expect(
        getVariant(section.type, section.variant)?.propsSchema.safeParse(
          section.props,
        ).success,
      ).toBe(true);
    for (const type of ["quote", "gallery"]) {
      const [first, second] = sections.filter((s) => s.type === type);
      first.props.validation_marker = "first";
      expect(second.props.validation_marker).toBeUndefined();
    }
  });

  it("preserves repeated authored content when switching templates and leaves the source untouched", () => {
    const sections = hydrateTemplateSections(template);
    let quote = 0,
      gallery = 0;
    for (const section of sections) {
      if (section.type === "quote")
        section.props = { text: `Authored quote ${++quote}`, source: "Author" };
      if (section.type === "gallery")
        section.props = {
          images: [
            {
              url: `https://example.com/gallery-${++gallery}.jpg`,
              caption: "Authored caption",
            },
          ],
          columns: 3,
        };
    }
    const original = structuredClone(sections);
    const other = getTemplate("sage-emas-klasik")!;
    const switched = mergeInvitationIntoTemplate(sections, template, other);
    const returned = mergeInvitationIntoTemplate(switched, other, template);
    expect(
      returned.filter((s) => s.type === "quote").map((s) => s.props.text),
    ).toEqual(["Authored quote 1", "Authored quote 2"]);
    expect(
      returned
        .filter((s) => s.type === "gallery")
        .map((s) => (s.props.images as { url: string }[])[0].url),
    ).toEqual([
      "https://example.com/gallery-1.jpg",
      "https://example.com/gallery-2.jpg",
    ]);
    expect(sections).toEqual(original);
    expect(new Set(returned.map((s) => s.id)).size).toBe(returned.length);
  });

  it("renders every registered variant in the existing Builder DeviceFrame", () => {
    const sections = hydrateTemplateSections(template);
    expect(getBuilderFlow(sections, "standard")).toBe(sections);
    const html = renderToStaticMarkup(
      <DeviceFrame preset={getDevice("galaxy-s25")}>
        {sections.map((s) => {
          const Component = getVariant(s.type, s.variant)!.component;
          return (
            <Component
              key={s.id}
              props={s.props}
              global={template.global_settings}
              inCanvas
              isPreview
              siblingTypes={journey}
            />
          );
        })}
      </DeviceFrame>,
    );
    expect(html).toContain("data-device-scroller");
    expect(html.match(/data-section="gallery"/g)).toHaveLength(2);
    expect(html.match(/data-section="quote"/g)).toHaveLength(2);
    expect(html).toContain("Konfirmasi Kehadiran");
    expect(html).toContain("Ucapan &amp; Doa");
    expect(html).not.toContain("data-cinematic-stage");
    expect(html).not.toContain("data-sekar-jawa-3d-stage");
  });

  it("handles an optional loader and cover without mutating the public section contract", () => {
    const sections = hydrateTemplateSections(template).filter(
      (s) => !["loading", "cover", "music"].includes(s.type),
    );
    const before = structuredClone(sections);
    const html = renderToStaticMarkup(
      <InvitationRenderer
        sections={sections}
        global={template.global_settings}
        composition="standard"
        isPreview
      />,
    );
    expect(html).not.toContain("data-loading-screen");
    expect(html).not.toContain("data-invitation-cover");
    expect(html).toContain("data-serambi-hero-focus");
    expect(sections).toEqual(before);
  });

  it.each([0, 1, 2, 4])(
    "renders %i events without a two-event assumption",
    (count) => {
      const events = Array.from({ length: count }, (_, i) => ({
        name: `Event ${i}`,
        date: "2027-01-01T08:00:00+07:00",
        start_time: "08:00",
        venue_name: "A long venue name",
        address: "A long address",
      }));
      const html = renderToStaticMarkup(
        <EventSerambiDelima
          props={{ events }}
          global={template.global_settings}
          inCanvas
        />,
      );
      expect(html.match(/<article/g) ?? []).toHaveLength(count);
    },
  );

  it("keeps Arabic direction and authored attribution in the existing quote contract", () => {
    const html = renderToStaticMarkup(
      <QuoteSerambiDelima
        props={{
          text: "بِسْمِ اللَّهِ\nAuthored translation",
          source: "Authored source",
        }}
        global={template.global_settings}
        inCanvas
      />,
    );
    expect(html).toContain('dir="rtl" lang="ar"');
    expect(html).toContain("Authored translation");
    expect(html).toContain("Authored source");
  });
});
