import { describe, expect, it } from "vitest";
import { cinematicScrollMap } from "./scroll-map";

const node = () => ({ style: { translate: "" } }) as HTMLElement;

describe("Cinematic outer-scroll traversal", () => {
  it("holds the timeline while the same owner traverses tall content", () => {
    const content = node();
    const map = cinematicScrollMap(20, 2000, [
      { at: 7, pixels: 1000, node: content },
    ]);
    expect(map.distance).toBe(3000);
    expect(map.position(7)).toBe(700);
    expect(map.position(8)).toBe(1800);
    expect(map.apply(700)).toMatchObject({ time: 7, panning: false });
    expect(map.apply(900)).toMatchObject({ time: 7, panning: true });
    expect(content.style.translate).toBe("0 -200px");
    expect(map.apply(1700)).toMatchObject({ time: 7, panning: false });
    expect(map.apply(1800).time).toBe(8);
    map.clear();
    expect(content.style.translate).toBe("");
  });

  it("keeps every Story memory and later chapter in order without skipping", () => {
    const first = node(), second = node();
    const map = cinematicScrollMap(24, 2400, [
      { at: 9, pixels: 420, node: second },
      { at: 3, pixels: 700, node: first },
    ]);
    expect(map.position(3)).toBe(300);
    expect(map.position(9)).toBe(1600);
    expect(map.position(12)).toBe(2320);
    expect(map.apply(800).time).toBe(3);
    expect(map.apply(1800).time).toBe(9);
    expect(map.apply(2320).time).toBe(12);
    map.apply(100);
    expect(first.style.translate).toBe("");
    expect(second.style.translate).toBe("");
  });

  it("offers the end of tall content as a resting point without rewinding read text", () => {
    const map = cinematicScrollMap(8, 800, [
      { at: 4, pixels: 1200, node: node() },
    ]);
    const rests = map.restingPositions([4]);
    expect(rests).toEqual([400, 1600]);
    const nearest = rests.reduce((a, b) =>
      Math.abs(a - 1650) < Math.abs(b - 1650) ? a : b,
    );
    expect(nearest).toBe(1600);
    expect(map.sample(1400).panning).toBe(true);
    expect(map.sample(nearest)).toEqual({ time: 4, panning: false });
  });
});
