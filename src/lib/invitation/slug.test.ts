import { describe, expect, it } from "vitest";
import { makeSlug, slugify, validateCustomSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, strips punctuation, collapses separators", () => {
    expect(slugify("Andi & Rima!")).toBe("andi-rima");
    expect(slugify("  The Wedding Of  ")).toBe("the-wedding-of");
    expect(slugify("WildanFirda")).toBe("wildanfirda");
  });
});

describe("makeSlug", () => {
  it("appends a random suffix", () => {
    const s = makeSlug("Andi Rima");
    expect(s).toMatch(/^andi-rima-[a-z0-9]{6}$/);
  });
});

describe("validateCustomSlug", () => {
  it("accepts a clean slug", () => {
    expect(validateCustomSlug("andi-rima")).toEqual({ slug: "andi-rima" });
    expect(validateCustomSlug("Andi Rima")).toEqual({ slug: "andi-rima" });
  });
  it("rejects too short", () => {
    expect(validateCustomSlug("ab")).toHaveProperty("error");
  });
  it("rejects reserved words", () => {
    expect(validateCustomSlug("admin")).toHaveProperty("error");
    expect(validateCustomSlug("Dashboard")).toHaveProperty("error");
  });
  it("normalises then validates", () => {
    expect(validateCustomSlug("--Wildan & Firda--")).toEqual({
      slug: "wildan-firda",
    });
  });
});
