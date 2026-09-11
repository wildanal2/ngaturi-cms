import { describe, expect, it } from "vitest";
import { getEnchantedGardenQuality } from "./quality";

describe("Enchanted Garden viewport quality", () => {
  it("uses actual narrow preview dimensions instead of host desktop width", () => {
    expect(getEnchantedGardenQuality(360, 780, true)).toBe("low");
    expect(getEnchantedGardenQuality(430, 850, true)).toBe("low");
  });

  it("keeps Builder conservative while allowing larger preview tiers", () => {
    expect(getEnchantedGardenQuality(744, 800, true)).toBe("medium");
    expect(getEnchantedGardenQuality(1280, 720, true)).toBe("high");
    expect(getEnchantedGardenQuality(1280, 500, true)).toBe("low");
  });

  it("allows a suitably sized public viewport to use high quality", () => {
    expect(getEnchantedGardenQuality(1024, 768, false)).toBe("high");
  });
});
