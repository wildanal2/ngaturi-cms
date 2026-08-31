import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/templates/catalog";
import { getCardVisual } from "./card-visual";

describe("getCardVisual", () => {
  it("uses Navy Elegan's watercolor, couple illustration, flowers, and seal", () => {
    const navy = TEMPLATES.find((template) => template.id === "navy-elegan");
    expect(navy).toBeDefined();

    expect(getCardVisual(navy!.sections)).toMatchObject({
      background: "/themes/navy-elegan/bg-watercolor.webp",
      foreground: "/themes/navy-elegan/couple-illustration.webp",
      ornamentLeft: "/themes/navy-elegan/flower-column-left.webp",
      ornamentRight: "/themes/navy-elegan/flower-column-right.webp",
      seal: "/themes/navy-elegan/wax-seal.png",
    });
  });
});
