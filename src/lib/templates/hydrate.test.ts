import { describe, expect, it } from "vitest";
import { hydrateTemplateSections, mergeValue } from "./hydrate";
import type { TemplatePreset } from "./catalog";

describe("mergeValue", () => {
  it("keeps the default when the override is empty", () => {
    expect(mergeValue("default.jpg", "")).toBe("default.jpg");
    expect(mergeValue([1, 2], [])).toEqual([1, 2]);
    expect(mergeValue("x", null)).toBe("x");
    expect(mergeValue("x", undefined)).toBe("x");
  });

  it("takes the override when it is non-empty", () => {
    expect(mergeValue("default.jpg", "custom.jpg")).toBe("custom.jpg");
    expect(mergeValue([1], [2, 3])).toEqual([2, 3]);
  });

  it("merges plain objects one level deep", () => {
    const def = { name: "Default", photo: "d.jpg" };
    expect(mergeValue(def, { name: "Dinda" })).toEqual({
      name: "Dinda",
      photo: "d.jpg",
    });
  });

  it("does not merge arrays as objects", () => {
    expect(mergeValue([{ a: 1 }], [{ b: 2 }])).toEqual([{ b: 2 }]);
  });
});

describe("hydrateTemplateSections", () => {
  const preset: TemplatePreset = {
    id: "t",
    name: "T",
    description: "",
    category: "wedding",
    tier: "free",
    thumbnail: "",
    global_settings: {} as TemplatePreset["global_settings"],
    sections: [
      { type: "gift", variant: "minimal", order: 5, visible: true, props: {} },
      {
        type: "couple-intro",
        variant: "side-by-side",
        order: 0,
        visible: true,
        props: { bride: { full_name: "Dinda" } },
      },
    ],
  } as TemplatePreset;

  const out = hydrateTemplateSections(preset);

  it("uses array position as the order", () => {
    expect(out.map((s) => s.order)).toEqual([0, 1]);
  });

  it("fills empty props from variant defaults (dummy data)", () => {
    const gift = out[0].props as { bank_accounts?: unknown[] };
    expect(Array.isArray(gift.bank_accounts)).toBe(true);
    expect((gift.bank_accounts ?? []).length).toBeGreaterThan(0);
  });

  it("deep-merges so an override keeps sibling defaults", () => {
    const couple = out[1].props as { bride?: Record<string, unknown> };
    expect(couple.bride?.full_name).toBe("Dinda");
    expect(couple.bride?.photo).toBeTruthy(); // dummy photo preserved
  });
});
