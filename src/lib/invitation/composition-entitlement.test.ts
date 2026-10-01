import { describe, expect, it } from "vitest";
import type { GlobalSettings, SectionData } from "@/sections/types";
import {
  basicCompositionViolation,
  countGalleryPhotos,
} from "./composition-entitlement";

const section = (
  value: Partial<SectionData> & Pick<SectionData, "id" | "type" | "variant">,
): SectionData => ({
  order: 0,
  visible: true,
  props: {},
  ...value,
});

const globalSettings: GlobalSettings = {
  font_family: "Fraunces",
  color_primary: "#111111",
  color_secondary: "#222222",
  color_background: "#ffffff",
};

describe("Basic composition grandfathering", () => {
  it("counts only populated gallery photos", () => {
    expect(
      countGalleryPhotos([
        section({
          id: "gallery",
          type: "gallery",
          variant: "grid",
          props: { images: [{ url: "/a.jpg" }, { url: "" }, {}] },
        }),
        section({ id: "hero", type: "hero", variant: "centered" }),
      ]),
    ).toBe(1);
  });

  it("allows ordinary content edits on a grandfathered Premium variant", () => {
    const current = [
      section({
        id: "quote",
        type: "quote",
        variant: "cinematic-vintage",
        props: { text: "Sebelum" },
      }),
    ];
    const next = [{ ...current[0], props: { text: "Sesudah" } }];
    expect(basicCompositionViolation(current, next, () => true)).toBeNull();
  });

  it("blocks switching to or duplicating a Premium variant", () => {
    const current = [
      section({ id: "quote", type: "quote", variant: "centered" }),
    ];
    expect(
      basicCompositionViolation(
        current,
        [{ ...current[0], variant: "cinematic-vintage" }],
        () => true,
      ),
    ).toBe("premium-feature-expansion");
    expect(
      basicCompositionViolation(
        current,
        [
          ...current,
          section({
            id: "new-quote",
            type: "quote",
            variant: "cinematic-vintage",
          }),
        ],
        () => true,
      ),
    ).toBe("premium-feature-expansion");
  });

  it("keeps existing music editable except for selecting a new track", () => {
    const current = [
      section({
        id: "music",
        type: "music",
        variant: "disc",
        props: { audio_url: "/old.mp3", start_at: 0 },
      }),
    ];
    expect(
      basicCompositionViolation(
        current,
        [{ ...current[0], props: { ...current[0].props, start_at: 20 } }],
        () => true,
      ),
    ).toBeNull();
    expect(
      basicCompositionViolation(
        current,
        [{ ...current[0], props: { audio_url: "/new.mp3" } }],
        () => true,
      ),
    ).toBe("music-change");
    expect(
      basicCompositionViolation(
        current,
        [{ ...current[0], props: { audio_url: "" } }],
        () => true,
      ),
    ).toBeNull();
  });

  it("blocks a new legacy global music URL and respects the photo policy", () => {
    expect(
      basicCompositionViolation([], [], () => true, globalSettings, {
        ...globalSettings,
        music_url: "/new.mp3",
      }),
    ).toBe("music-change");
    expect(basicCompositionViolation([], [], () => false)).toBe(
      "gallery-photo-limit",
    );
  });

  it("blocks replacement additions while a grandfathered gallery is over 30", () => {
    const images = Array.from({ length: 31 }, (_, index) => ({
      url: `/photo-${index}.jpg`,
    }));
    const current = [
      section({
        id: "gallery",
        type: "gallery",
        variant: "grid",
        props: { images },
      }),
    ];
    const removedOnly = [
      { ...current[0], props: { images: images.slice(0, 30) } },
    ];
    const replacedWhileOver = [
      {
        ...current[0],
        props: { images: [...images.slice(0, 30), { url: "/new.jpg" }] },
      },
    ];

    expect(
      basicCompositionViolation(current, removedOnly, () => true),
    ).toBeNull();
    expect(
      basicCompositionViolation(current, replacedWhileOver, () => true),
    ).toBe("gallery-photo-limit");
  });
});
