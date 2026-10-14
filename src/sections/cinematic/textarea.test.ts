import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeCinematicTextarea } from "./textarea";

afterEach(() => vi.unstubAllGlobals());
describe("Cinematic text entry stays in the main scroll flow", () => {
  it("fits every line including borders, and shrinks again after a reset", () => {
    vi.stubGlobal("getComputedStyle", () => ({
      borderTopWidth: "1px",
      borderBottomWidth: "1px",
    }));
    const heights: string[] = [];
    const field = {
      scrollHeight: 288,
      style: {
        set height(value: string) {
          heights.push(value);
        },
      },
    };
    resizeCinematicTextarea(field as unknown as HTMLTextAreaElement);
    expect(heights).toEqual(["auto", "290px"]);
    field.scrollHeight = 120;
    resizeCinematicTextarea(field as unknown as HTMLTextAreaElement);
    expect(heights.slice(-2)).toEqual(["auto", "122px"]);
  });
});
