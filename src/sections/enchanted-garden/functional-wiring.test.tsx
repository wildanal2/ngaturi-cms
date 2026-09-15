import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { getVariant } from "../registry";
import { RsvpFormCard } from "../rsvp";
import { GuestbookCards } from "../guestbook";
import { GiftCards } from "../gift";
import { MapButton } from "../map";
import { CountdownElegant } from "../countdown";
import { GallerySpotlight } from "../gallery";
import { MusicDisc } from "../music";
import { NavigationDock } from "../navigation";
import { eventCalendarUrl, normalizeEventDetails } from "../events/event-data";
import { EnchantedGardenComposition } from "./composition";
import { enchantedGardenContent, enchantedGardenSectionProps } from "./content";

const template = getTemplate("enchanted-garden")!;
const sections = () => hydrateTemplateSections(template);

describe("Enchanted Garden functional wiring", () => {
  it("uses the existing RSVP, guestbook, gift, and map implementations", () => {
    expect(getVariant("rsvp", "form-card")?.component).toBe(RsvpFormCard);
    expect(getVariant("guestbook", "cards")?.component).toBe(GuestbookCards);
    expect(getVariant("gift", "cards")?.component).toBe(GiftCards);
    expect(getVariant("map-location", "button")?.component).toBe(MapButton);
  });

  it("uses the existing countdown, gallery lightbox, music, and navigation implementations", () => {
    expect(getVariant("countdown", "elegant")?.component).toBe(
      CountdownElegant,
    );
    expect(getVariant("gallery", "spotlight")?.component).toBe(
      GallerySpotlight,
    );
    expect(getVariant("music", "disc")?.component).toBe(MusicDisc);
    expect(getVariant("navigation", "dock")?.component).toBe(NavigationDock);
  });

  it("exposes the required Enchanted Garden journey destinations without changing the shared dock default", () => {
    const navigation = sections().find(
      (section) => section.type === "navigation",
    )!;
    expect(navigation.props.max_items).toBe(7);

    const markup = renderToStaticMarkup(
      <NavigationDock
        props={navigation.props}
        global={template.global_settings}
        siblingTypes={sections().map((section) => section.type)}
      />,
    );
    expect(markup).toContain('aria-label="Lokasi"');
    expect(markup).toContain('aria-label="RSVP"');
    expect(markup.match(/<button/g)).toHaveLength(7);
  });

  it("normalizes all configured events and derives hero/countdown from the first event", () => {
    const input = sections();
    const eventSection = input.find(
      (section) => section.type === "event-details",
    )!;
    eventSection.props.events = [
      {
        name: "Akad",
        date: "2040-06-01",
        start_time: "08:00",
        end_time: "10:00",
        venue_name: "Pendopo Satu",
        address: "Jalan Satu",
      },
      {
        name: "Resepsi",
        date: "2040-06-02",
        start_time: "11:00",
        end_time: "13:00",
        venue_name: "Pendopo Dua",
      },
    ];

    const content = enchantedGardenContent(input);
    expect(content.events.map((event) => event.name)).toEqual([
      "Akad",
      "Resepsi",
    ]);
    expect(content.eventDate).toBe("2040-06-01");
    const countdown = input.find((section) => section.type === "countdown")!;
    expect(
      enchantedGardenSectionProps(countdown, content.events, content.eventDate)
        .target_date,
    ).toBe("2040-06-01");

    const markup = renderToStaticMarkup(
      <EnchantedGardenComposition
        sections={input}
        global={{ ...template.global_settings, presentationMode: "simple" }}
      />,
    );
    expect(markup.match(/Kalender/g)).toHaveLength(2);
    expect(markup).toContain("20400601T080000%2F20400601T100000");
    expect(markup).toContain("Pendopo+Satu%2C+Jalan+Satu");
  });

  it("builds calendar actions only from existing event data", () => {
    const [event] = normalizeEventDetails([
      {
        name: "Akad Nikah",
        date: "2041-01-03",
        start_time: "08:30",
        end_time: "10:00",
        venue_name: "Pendopo",
      },
    ]);
    const url = eventCalendarUrl(event);
    expect(url).toContain("text=Akad+Nikah");
    expect(url).toContain("dates=20410103T083000%2F20410103T100000");
    expect(url).toContain("location=Pendopo");
  });

  it("keeps composition identity and one Canvas across functional prop updates", () => {
    const input = sections();
    input.find((section) => section.type === "rsvp")!.props.require_phone =
      true;
    input.find((section) => section.type === "gift")!.props.intro =
      "Hadiah dari data undangan";
    const markup = renderToStaticMarkup(
      <EnchantedGardenComposition
        sections={input}
        global={template.global_settings}
        invitationId="functional-test"
      />,
    );

    expect(markup).toContain('data-presentation-mode="cinematic"');
    expect(markup.match(/data-enchanted-garden-canvas/g)).toHaveLength(1);
    expect(markup).toContain("Hadiah dari data undangan");
  });

  it("keeps the same functional DOM available in immersive and Simple modes", () => {
    const input = sections();
    input.find((section) => section.type === "gallery")!.props.images = [
      { url: "/functional-gallery.jpg", caption: "Kenangan" },
    ];
    input.find((section) => section.type === "map-location")!.props.maps_url =
      "https://maps.example/venue";
    const render = (presentationMode: "cinematic" | "simple") =>
      renderToStaticMarkup(
        <EnchantedGardenComposition
          sections={input}
          global={{ ...template.global_settings, presentationMode }}
          invitationId="functional-equivalence"
        />,
      );

    for (const markup of [render("cinematic"), render("simple")]) {
      expect(markup).toContain("Kirim konfirmasi");
      expect(markup).toContain("Kirim ucapan");
      expect(markup).toContain("functional-gallery.jpg");
      expect(markup).toContain("https://maps.example/venue");
    }
    expect(enchantedGardenContent(input).remaining.map((s) => s.type)).toEqual(
      expect.arrayContaining(["music", "navigation"]),
    );
  });
});
