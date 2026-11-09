import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCinematicSettling, nearbyCinematicRest } from "./settling";

class Node extends EventTarget {
  protected = false;
  scrollTop = 100;
  clientHeight = 800;
  closest(selector: string) {
    return selector === ".cinematic-invitation"
      ? null
      : this.protected
        ? this
        : null;
  }
  scrollTo = vi.fn(({ top }: { top: number }) => {
    this.scrollTop = top;
  });
}

function setup(local = false) {
  const root = new Node();
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const win = Object.assign(new Node(), {
    scrollY: 100,
    innerHeight: 800,
    matchMedia: () => reduced,
  });
  win.scrollTo = vi.fn(({ top }) => {
    win.scrollY = top;
  });
  const doc = Object.assign(new EventTarget(), {
    activeElement: null as Node | null,
  });
  const scroller = local ? new Node() : null;
  const owner = scroller ?? win;
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("HTMLElement", Node);
  vi.stubGlobal(
    "KeyboardEvent",
    class extends Event {
      key = "ArrowDown";
    },
  );
  vi.stubGlobal(
    "WheelEvent",
    class extends Event {
      deltaY = 80;
    },
  );
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const target = vi.fn<() => number | null>(() => 170);
  const controller = mountCinematicSettling(
    root as unknown as HTMLElement,
    scroller as unknown as HTMLElement | null,
    target,
  );
  const tick = (now: number) => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(now));
  };
  const wheel = () => {
    owner.dispatchEvent(new Event("wheel"));
    if (scroller) scroller.scrollTop += 20;
    else win.scrollY += 20;
    controller.onScroll();
  };
  return {
    root,
    win,
    owner,
    scroller,
    doc,
    reduced,
    target,
    controller,
    tick,
    wheel,
    frames,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Cinematic manual scroll settling", () => {
  it("suspends idle assistance during text selection and an open overlay", () => {
    const f = setup();
    const selection = { isCollapsed: true };
    Object.assign(f.doc, { getSelection: () => selection });
    f.wheel();
    selection.isCollapsed = false;
    f.doc.dispatchEvent(new Event("selectionchange"));
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    selection.isCollapsed = true;
    Object.assign(f.root, { dataset: { cinematicOverlay: "lightbox" } });
    f.wheel();
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.controller.dispose();
  });
  it("assists only near a forward or backward beat in the deliberate direction", () => {
    expect(nearbyCinematicRest(100, 150, 1, 800)).toBe(true);
    expect(nearbyCinematicRest(100, 50, -1, 800)).toBe(true);
    expect(nearbyCinematicRest(100, 50, 1, 800)).toBe(false);
    expect(nearbyCinematicRest(100, 500, 1, 800)).toBe(false);
    expect(nearbyCinematicRest(100, 100, 0, 800)).toBe(false);
  });
  it("does not move backward after a forward wheel or skip to a distant chapter", () => {
    const f = setup();
    for (const destination of [100, 500]) {
      f.target.mockReturnValue(destination);
      f.wheel();
      const position = f.win.scrollY;
      vi.advanceTimersByTime(1000);
      f.tick(0);
      f.tick(450);
      expect(f.win.scrollY).toBe(position);
    }
    f.controller.dispose();
  });
  it("does not let noneditable scene focus block owner scrolling", () => {
    const f = setup();
    f.doc.activeElement = new Node();
    f.wheel();
    vi.advanceTimersByTime(300);
    f.tick(0);
    f.tick(450);
    expect(f.win.scrollY).toBe(170);
    f.controller.dispose();
  });
  it("waits 300ms after manual scrolling, then reaches the timeline beat", () => {
    const f = setup();
    f.wheel();
    vi.advanceTimersByTime(299);
    expect(f.target).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    f.tick(0);
    f.tick(210);
    f.tick(450);
    expect(f.win.scrollY).toBe(170);
    expect(f.win.scrollTo).toHaveBeenCalledWith({
      top: 170,
      behavior: "instant",
    });
    f.controller.dispose();
  });
  it("does not settle programmatic scrolling or a stage without a valid beat", () => {
    const f = setup();
    f.controller.onScroll();
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.target.mockReturnValue(null);
    f.wheel();
    vi.advanceTimersByTime(300);
    expect(f.frames.size).toBe(0);
    f.controller.dispose();
  });
  it("does not settle a tap or pointer click without scrolling", () => {
    const f = setup();
    f.owner.dispatchEvent(new Event("pointerdown"));
    f.doc.dispatchEvent(new Event("pointerup"));
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.controller.dispose();
  });
  it("recognizes compositor scrolling before a passive wheel listener runs", () => {
    const f = setup();
    f.target.mockReturnValue(210);
    f.win.scrollY += 80;
    f.owner.dispatchEvent(new Event("wheel"));
    f.controller.onScroll();
    vi.advanceTimersByTime(300);
    f.tick(0);
    f.tick(450);
    expect(f.win.scrollY).toBe(210);
    f.controller.dispose();
  });
  it("waits for touch release even when native panning cancels Pointer Events", () => {
    const f = setup();
    f.owner.dispatchEvent(new Event("touchstart"));
    f.doc.dispatchEvent(new Event("pointercancel"));
    f.target.mockReturnValue(210);
    f.win.scrollY += 80;
    f.controller.onScroll();
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.owner.dispatchEvent(new Event("touchend"));
    vi.advanceTimersByTime(300);
    f.tick(0);
    f.tick(450);
    expect(f.win.scrollY).toBe(210);
    f.controller.dispose();
  });
  it("cancels immediately when another touch begins or navigation seeks", () => {
    const f = setup();
    f.wheel();
    vi.advanceTimersByTime(300);
    f.tick(0);
    f.tick(210);
    const position = f.win.scrollY;
    f.owner.dispatchEvent(new Event("touchstart"));
    f.tick(450);
    expect(f.win.scrollY).toBe(position);
    vi.advanceTimersByTime(1000);
    expect(f.frames.size).toBe(0);
    f.owner.dispatchEvent(new Event("touchend"));
    f.root.dispatchEvent(new Event("cinematic:seek"));
    vi.advanceTimersByTime(1000);
    expect(f.frames.size).toBe(0);
    f.controller.dispose();
  });
  it("cancels an active settle on a fresh wheel and recalculates after the new idle", () => {
    const f = setup();
    f.wheel();
    vi.advanceTimersByTime(300);
    f.tick(0);
    f.tick(210);
    const halfway = f.win.scrollY;
    f.wheel();
    f.tick(450);
    expect(f.win.scrollY).toBe(halfway + 20);
    vi.advanceTimersByTime(299);
    expect(f.target).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(f.target).toHaveBeenCalledTimes(2);
    f.tick(500);
    f.tick(950);
    expect(f.win.scrollY).toBe(170);
    f.controller.dispose();
  });
  it("never settles focused forms or protected reading and interaction controls", () => {
    const f = setup();
    const control = new Node();
    control.protected = true;
    f.owner.protected = true;
    f.wheel();
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.owner.protected = false;
    f.doc.activeElement = control;
    f.wheel();
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.doc.activeElement = null;
    f.wheel();
    f.doc.activeElement = control;
    f.doc.dispatchEvent(new Event("focusin"));
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.controller.dispose();
  });
  it("honors reduced motion even if changed while waiting", () => {
    const f = setup();
    f.wheel();
    f.reduced.matches = true;
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.controller.dispose();
  });
  it("uses only the Builder scroll owner and removes pending work on cleanup", () => {
    const f = setup(true);
    f.win.dispatchEvent(new Event("wheel"));
    f.controller.onScroll();
    vi.advanceTimersByTime(1000);
    expect(f.target).not.toHaveBeenCalled();
    f.wheel();
    vi.advanceTimersByTime(300);
    f.tick(0);
    f.tick(450);
    expect(f.scroller!.scrollTop).toBe(170);
    expect(f.win.scrollY).toBe(100);
    f.wheel();
    f.controller.dispose();
    vi.advanceTimersByTime(1000);
    expect(f.frames.size).toBe(0);
  });
});
