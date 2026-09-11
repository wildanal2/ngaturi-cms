import { describe, expect, it } from "vitest";
import {
  clampJourneyProgress,
  createJourneyCameraTransform,
  ENCHANTED_GARDEN_JOURNEY,
  writeJourneyCameraTransform,
} from "./journey";

describe("Enchanted Garden journey", () => {
  it("has unique identities and one contiguous normalized range", () => {
    const ids = ENCHANTED_GARDEN_JOURNEY.map((stop) => stop.id);
    const sections = ENCHANTED_GARDEN_JOURNEY.flatMap((stop) =>
      "section" in stop ? [stop.section] : [],
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(sections).size).toBe(sections.length);
    expect(ENCHANTED_GARDEN_JOURNEY[0].range[0]).toBe(0);
    expect(ENCHANTED_GARDEN_JOURNEY.at(-1)?.range[1]).toBe(1);

    ENCHANTED_GARDEN_JOURNEY.forEach((stop, index) => {
      expect(stop.range[0]).toBeLessThan(stop.range[1]);
      if (index > 0) {
        expect(stop.range[0]).toBe(
          ENCHANTED_GARDEN_JOURNEY[index - 1].range[1],
        );
      }
    });
  });

  it("clamps invalid and out-of-range progress", () => {
    expect(clampJourneyProgress(Number.NaN)).toBe(0);
    expect(clampJourneyProgress(-1)).toBe(0);
    expect(clampJourneyProgress(0.4)).toBe(0.4);
    expect(clampJourneyProgress(2)).toBe(1);
  });

  it("writes smooth camera transforms into caller-owned storage", () => {
    const output = createJourneyCameraTransform();
    const position = output.position;
    const target = output.target;
    const result = writeJourneyCameraTransform(0.13, output);

    expect(result).toBe(output);
    expect(result.position).toBe(position);
    expect(result.target).toBe(target);
    expect(result.position[2]).toBeLessThan(21);
    expect(result.position[2]).toBeGreaterThan(14.5);
  });

  it("holds the final camera stop at progress one", () => {
    const output = writeJourneyCameraTransform(
      1,
      createJourneyCameraTransform(),
    );
    const last = ENCHANTED_GARDEN_JOURNEY.at(-1)!;

    expect(output.position).toEqual(last.camera.position);
    expect(output.target).toEqual(last.camera.target);
    expect(output.fov).toBe(last.camera.fov);
  });
});
