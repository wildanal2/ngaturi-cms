import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/templates/catalog";
import { cardImageUrl, getCardVisual } from "./card-visual";

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

describe("cardImageUrl", () => {
  const trusted = [
    "https://legacy-media.example.com",
    "https://media.example.com",
  ];

  it("accepts both configured migration origins", () => {
    expect(
      cardImageUrl(
        "https://legacy-media.example.com/invitations/old.webp",
        "https://ngaturi.test",
        trusted,
      ),
    ).toBe("https://legacy-media.example.com/invitations/old.webp");
    expect(
      cardImageUrl(
        "https://media.example.com/invitations/new.webp",
        "https://ngaturi.test",
        trusted,
      ),
    ).toBe("https://media.example.com/invitations/new.webp");
  });

  it("rejects hostname-prefix spoofing", () => {
    expect(
      cardImageUrl(
        "https://media.example.com.evil.test/invitations/x.webp",
        "https://ngaturi.test",
        trusted,
      ),
    ).toBeUndefined();
  });
});
