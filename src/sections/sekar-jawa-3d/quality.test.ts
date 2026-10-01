import { describe, expect, it } from "vitest";
import { getSekarJawa3DDpr, getSekarJawa3DQuality } from "./quality";

describe("Sekar Jawa 3D viewport quality", () => {
  it("uses conservative quality-aware DPR caps", () => {
    expect(getSekarJawa3DDpr("low")).toBe(1);
    expect(getSekarJawa3DDpr("medium")).toEqual([1, 1.25]);
    expect(getSekarJawa3DDpr("high")).toEqual([1, 1.5]);
  });

  it("uses actual narrow preview dimensions instead of host desktop width", () => {
    expect(getSekarJawa3DQuality(360, 780, true)).toBe("low");
    expect(getSekarJawa3DQuality(430, 850, true)).toBe("low");
  });

  it("keeps Builder conservative while allowing larger preview tiers", () => {
    expect(getSekarJawa3DQuality(744, 800, true)).toBe("medium");
    expect(getSekarJawa3DQuality(1280, 720, true)).toBe("high");
    expect(getSekarJawa3DQuality(1280, 500, true)).toBe("low");
  });

  it("allows a suitably sized public viewport to use high quality", () => {
    expect(getSekarJawa3DQuality(1024, 768, false)).toBe("high");
  });
});
