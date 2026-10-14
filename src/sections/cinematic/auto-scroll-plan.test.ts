import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cinematicStageAutoStops,
  cinematicReadingHold,
  naturalCinematicStops,
  cinematicAutoPlan,
  registerCinematicAutoStage,
} from "./auto-scroll-plan";
import { cinematicScrollMap } from "./scroll-map";
const node = (kind: string, id = kind) =>
  ({
    dataset: { section: kind, sectionId: id },
    textContent: "A meaningful memory",
    style: { translate: "" },
    closest() {
      return this;
    },
  }) as unknown as HTMLElement;
afterEach(() => vi.unstubAllGlobals());
describe("Cinematic automatic journey geometry", () => {
  it("uses every real Gallery beat and inserts complete tall Story/Event traversal", () => {
    const story = node("story"),
      photo1 = node("gallery", "gallery"),
      photo2 = node("gallery", "gallery"),
      event = node("event-details");
    const map = cinematicScrollMap(40, 4000, [
      { at: 3, pixels: 1100, node: story },
      { at: 24, pixels: 900, node: event },
    ]);
    const stops = cinematicStageAutoStops({
      root: { querySelector: () => story } as unknown as HTMLElement,
      start: 70,
      map,
      rests: new Map([
        [story, 3],
        [photo1, 12],
        [photo2, 15],
        [event, 24],
      ]),
      duration: 40,
      height: 800,
      linear: false,
      closing: false,
      scroller: null,
    });
    expect(stops.map((s) => s.position)).toEqual([
      370, 1470, 2370, 2670, 3570, 4470, 6070,
    ]);
    expect(stops[1]).toMatchObject({ reading: true, holdMs: 2500 });
    expect(stops[1].travelMs).toBeGreaterThan(60000);
    expect(stops[4].holdMs).toBeGreaterThan(stops[2].holdMs);
  });
  it("finishes at Closing's fully traversed readable position, not its clipped first view", () => {
    const closing = node("closing");
    const map = cinematicScrollMap(8, 800, [
      { at: 4, pixels: 1200, node: closing },
    ]);
    const stops = cinematicStageAutoStops({
      root: closing,
      start: 1000,
      map,
      rests: new Map([[closing, 4]]),
      duration: 8,
      height: 800,
      linear: false,
      closing: true,
      scroller: null,
    });
    expect(stops.map((s) => s.position)).toEqual([1400, 2600]);
    expect(stops[0].final).toBeUndefined();
    expect(stops[1].final).toBe(true);
  });
  it("keeps tall interactions in natural outer flow with readable holds", () => {
    vi.stubGlobal("window", { scrollY: 100 });
    const rsvp = Object.assign(node("rsvp"), {
      getBoundingClientRect: () => ({ top: 200, height: 1700 }),
    });
    const stops = naturalCinematicStops(rsvp, 800, null);
    expect(stops.map((s) => s.position)).toEqual([300, 740, 1180, 1300]);
    expect(stops[0].holdMs).toBe(18000);
    expect(stops.slice(1).every((s) => s.reading && s.travelMs >= 6000)).toBe(
      true,
    );
    expect(cinematicReadingHold("gift", "")).toBeGreaterThan(
      cinematicReadingHold("gallery", ""),
    );
  });
  it("follows mounted chapter order, waits for stage registration and cleans up", () => {
    vi.stubGlobal("window", { scrollY: 0, innerHeight: 800 });
    vi.stubGlobal("document", { documentElement: { scrollHeight: 5000 } });
    const stage = { hasAttribute: () => true } as unknown as HTMLElement;
    const closing = { hasAttribute: () => true } as unknown as HTMLElement;
    const rsvp = Object.assign(node("rsvp"), {
      hasAttribute: () => false,
      getBoundingClientRect: () => ({ top: 1000, height: 500 }),
    });
    const root = {
      querySelectorAll: () => [stage, rsvp, closing],
    } as unknown as HTMLElement;
    expect(cinematicAutoPlan(root, null)).toBeNull();
    const unregister = registerCinematicAutoStage(stage, () => [
      {
        id: "gallery",
        position: 800,
        node: stage,
        travelMs: 2000,
        holdMs: 3000,
      },
    ]);
    const unregisterClosing = registerCinematicAutoStage(closing, () => [
      {
        id: "closing",
        position: 4500,
        node: closing,
        travelMs: 2000,
        holdMs: 0,
        final: true,
      },
    ]);
    expect(
      cinematicAutoPlan(root, null)?.map((s) => [s.id, s.position]),
    ).toEqual([
      ["gallery", 800],
      ["rsvp:natural:0", 1000],
      ["closing", 4200],
    ]);
    // Hidden/empty chapters are absent from the rendered journey, without phantom stops.
    expect(
      cinematicAutoPlan(root, null)?.some((s) => s.id.includes("story")),
    ).toBe(false);
    unregister();
    expect(cinematicAutoPlan(root, null)).toBeNull();
    unregisterClosing();
  });
  it("uses each natural-height Gallery panel in short landscape and the local owner geometry", () => {
    const panels = [100, 650, 1200].map((top) =>
      Object.assign(node("gallery"), {
        getBoundingClientRect: () => ({ top, height: 300 }),
      }),
    );
    const gallery = Object.assign(node("gallery"), {
      querySelectorAll: () => panels,
    });
    const root = {
      querySelectorAll: () => [gallery],
    } as unknown as HTMLElement;
    const scroller = {
      scrollTop: 50,
      getBoundingClientRect: () => ({ top: 100 }),
    } as HTMLElement;
    const stops = cinematicStageAutoStops({
      root,
      scroller,
      start: 0,
      map: cinematicScrollMap(10, 1000, []),
      rests: new Map(),
      duration: 10,
      height: 390,
      linear: true,
      closing: false,
    });
    expect(stops.map((s) => s.position)).toEqual([
      50, 60, 600, 610, 1150, 1160,
    ]);
    expect(new Set(stops.map((s) => s.id)).size).toBe(stops.length);
  });
});
