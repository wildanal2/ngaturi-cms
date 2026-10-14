import { describe, expect, it } from "vitest";
import { cinematicDestinations } from "./chrome";

describe("Cinematic chapter pager", () => {
  it("uses composition order rather than content extraction order", () => {
    const items = cinematicDestinations([
      "hero",
      "couple-intro",
      "quote",
      "gallery",
      "event-details",
      "closing",
      "countdown",
      "rsvp",
      "gift",
      "guestbook",
    ]);
    expect(items.map((item) => item.type)).toEqual([
      "hero",
      "couple-intro",
      "quote",
      "countdown",
      "gallery",
      "event-details",
      "rsvp",
      "gift",
      "guestbook",
      "closing",
    ]);
  });
  it("skips omitted chapters, duplicate sections and persistent chrome", () => {
    expect(
      cinematicDestinations([
        "hero",
        "event-details",
        "event-details",
        "navigation",
        "music",
        "closing",
      ]).map((item) => item.label),
    ).toEqual(["Awal", "Acara", "Penutup"]);
  });
  it("follows actual rendered order when available", () => {
    expect(
      cinematicDestinations(["rsvp", "guestbook", "closing"], true).map(
        (item) => item.type,
      ),
    ).toEqual(["rsvp", "guestbook", "closing"]);
    expect(
      cinematicDestinations(["gallery", "hero"], true).map((item) => item.type),
    ).toEqual(["gallery", "hero"]);
  });
});
