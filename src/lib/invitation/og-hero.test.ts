import { describe, expect, it } from "vitest";
import { getCardVisual } from "./card-visual";
import { contrast, getOgHero, nameFontSize, readableInk } from "./og-hero";

const cover = {
  type: "cover",
  variant: "wax-seal",
  props: {
    background_image: "/themes/cover-gate.jpg",
    seal_image: "/seal.png",
  },
};
const hero = (variant: string, props: Record<string, unknown> = {}) => ({
  type: "hero",
  variant,
  props,
});

describe("getOgHero: opened invitation, not the opening gate", () => {
  it("prefers the hero photo over cover.background_image", () => {
    const og = getOgHero([
      cover,
      hero("centered", { background_image: "https://media.example.com/h.jpg" }),
    ]);
    expect(og.photo).toBe("https://media.example.com/h.jpg");
    expect(JSON.stringify(og)).not.toContain("cover-gate");
  });

  it("never falls back to the cover photo when the hero has none", () => {
    const og = getOgHero([cover, hero("centered")]);
    expect(og.photo).toBeUndefined();
    expect(og.layout).toBe("typographic");
    expect(JSON.stringify(og)).not.toContain("cover-gate");
    expect(JSON.stringify(og)).not.toContain("seal");
  });

  it("is typographic for cover-only compositions and hidden heroes", () => {
    expect(getOgHero([cover]).layout).toBe("typographic");
    expect(
      getOgHero([
        cover,
        { ...hero("centered", { background_image: "/a.jpg" }), visible: false },
      ]).layout,
    ).toBe("typographic");
  });

  it.each([
    ["centered", "fullscreen"],
    ["sekar-jawa-3d", "fullscreen"],
    ["gerbang-puspa", "fullscreen"],
    ["split", "split"],
    ["serambi-delima", "split"],
    ["lakon-kencana", "split"],
    ["arch", "framed"],
    ["cinematic-vintage", "framed"],
  ])("%s with a photo renders as %s", (variant, layout) => {
    expect(
      getOgHero([hero(variant, { background_image: "/p.jpg" })]).layout,
    ).toBe(layout);
  });

  it.each(["minimal", "botanical", "floating17", "something-new"])(
    "%s is typographic",
    (variant) => {
      expect(
        getOgHero([hero(variant, { background_image: "/p.jpg" })]).layout,
      ).toBe("typographic");
    },
  );

  it("falls back to typography when a photo layout has no photo", () => {
    for (const v of ["centered", "split", "serambi-delima", "arch", "garland"])
      expect(getOgHero([hero(v)]).layout).toBe("typographic");
  });

  it("uses the garden gate artwork for Gerbang Puspa without a photo", () => {
    const og = getOgHero([hero("gerbang-puspa")]);
    expect(og).toMatchObject({
      layout: "fullscreen",
      photo: "/themes/gerbang-puspa/garden-gate.svg",
    });
  });

  it("builds the illustration layout from couple_image + backdrop + florals", () => {
    const og = getOgHero([
      hero("garland", {
        couple_image: "/c.png",
        background_image: "/bg.png",
        flower_left_image: "/l.png",
        flower_right_image: "/r.png",
      }),
    ]);
    expect(og).toMatchObject({
      layout: "illustration",
      photo: "/c.png",
      backdrop: "/bg.png",
      ornamentLeft: "/l.png",
      ornamentRight: "/r.png",
    });
  });

  it("honours photo side, noir palette and a validated focal position", () => {
    expect(
      getOgHero([
        hero("split", { background_image: "/p.jpg", s_photo_side: "right" }),
      ]).photoSide,
    ).toBe("right");
    expect(getOgHero([hero("botanical", { s_palette: "noir" })]).dark).toBe(
      true,
    );
    expect(
      getOgHero([
        hero("centered", {
          background_image: "/p.jpg",
          photo_position: "50% 20%",
        }),
      ]).position,
    ).toBe("50% 20%");
    expect(
      getOgHero([
        hero("centered", {
          background_image: "/p.jpg",
          photo_position: "url(x)",
        }),
      ]).position,
    ).toBe("50% 35%");
  });

  it("rejects non-image-looking values such as protocol-relative URLs", () => {
    const og = getOgHero([
      hero("centered", { background_image: "//evil.example/x.jpg" }),
    ]);
    expect(og.photo).toBeUndefined();
    expect(
      getOgHero([hero("centered", { background_image: "javascript:alert(1)" })])
        .photo,
    ).toBeUndefined();
  });

  it("leaves the catalog thumbnail selector (getCardVisual) cover-first", () => {
    expect(
      getCardVisual([cover, hero("centered", { background_image: "/h.jpg" })])
        .background,
    ).toBe("/themes/cover-gate.jpg");
  });
});

describe("OG typography helpers", () => {
  it("keeps legible template ink and swaps unreadable ink", () => {
    expect(readableInk("#1f2937", "#f2f4f9")).toBe("#1f2937");
    expect(contrast("#243b30", "#0f1512")).toBeLessThan(4.5);
    expect(readableInk("#243b30", "#0f1512")).toBe("#fffdf8");
    expect(readableInk("not-a-colour", "#ffffff")).toBe("#1b1612");
  });

  it("shrinks long names so they stay inside the safe area", () => {
    expect(nameFontSize("Alya & Bima")).toBe(92);
    const long =
      "Raden Ajeng Kusumawardhani Prameswari & Raden Mas Haryo Wibisono";
    expect(nameFontSize(long)).toBeLessThan(nameFontSize("Alya & Bima"));
    expect(nameFontSize(long)).toBeGreaterThanOrEqual(40);
  });
});
