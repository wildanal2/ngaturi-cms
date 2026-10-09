import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCinematicAutoScroll } from "./auto-scroll";
import { mountCinematicSettling } from "./settling";
import type { CinematicAutoStop } from "./auto-scroll-plan";

class Node extends EventTarget {
  dataset: Record<string, string> = {};
  hidden = false;
  control = false;
  scrollTop = 0;
  clientHeight = 800;
  contains(n: Node) {
    return n.control;
  }
  closest(selector: string) {
    return selector.includes("input") && this.control ? this : null;
  }
  matches() {
    return false;
  }
  querySelector() {
    return null;
  }
  scrollTo = vi.fn(({ top }: { top: number }) => {
    this.scrollTop = top;
  });
}
function setup(local = false) {
  const root = new Node();
  const cover = new Node();
  cover.dataset.open = "0";
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const win = Object.assign(new Node(), {
    scrollY: 0,
    innerHeight: 800,
    matchMedia: () => reduced,
  });
  win.scrollTo = vi.fn(({ top }) => {
    win.scrollY = top;
  });
  const doc = Object.assign(new EventTarget(), {
    activeElement: null as Node | null,
    hidden: false,
  });
  const frames = new Map<number, FrameRequestCallback>();
  let serial = 0;
  const scroller = local ? new Node() : null;
  const owner = scroller ?? win;
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLElement", Node);
  vi.stubGlobal(
    "KeyboardEvent",
    class extends Event {
      key = "ArrowDown";
    },
  );
  vi.stubGlobal(
    "MutationObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(++serial, cb);
    return serial;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const stops: CinematicAutoStop[] = [
    {
      id: "hero",
      node: root as unknown as HTMLElement,
      position: 300,
      travelMs: 1000,
      holdMs: 2000,
    },
    {
      id: "gallery-1",
      node: root as unknown as HTMLElement,
      position: 600,
      travelMs: 1000,
      holdMs: 2000,
    },
    {
      id: "gallery-2",
      node: root as unknown as HTMLElement,
      position: 900,
      travelMs: 1000,
      holdMs: 2000,
    },
    {
      id: "story-pan",
      node: root as unknown as HTMLElement,
      position: 1600,
      travelMs: 1000,
      holdMs: 2000,
      reading: true,
    },
    {
      id: "closing",
      node: root as unknown as HTMLElement,
      position: 2000,
      travelMs: 1000,
      holdMs: 0,
      final: true,
    },
  ];
  const plan = vi.fn<() => CinematicAutoStop[] | null>(() => stops);
  const controller = mountCinematicAutoScroll(
    root as unknown as HTMLElement,
    scroller as unknown as HTMLElement | null,
    { cover: cover as unknown as HTMLElement, plan },
  );
  const tick = (now: number) => {
    const current = [...frames.values()];
    frames.clear();
    current.forEach((cb) => cb(now));
  };
  const open = () => {
    win.dispatchEvent(new Event("ngaturi:open"));
    tick(0);
  };
  const ready = () => {
    cover.hidden = true;
    cover.dataset.open = "1";
    tick(0);
  };
  const top = () => (local ? owner.scrollTop : win.scrollY);
  return {
    root,
    cover,
    reduced,
    win,
    owner,
    doc,
    frames,
    stops,
    plan,
    controller,
    tick,
    open,
    ready,
    top,
    scroller,
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Cinematic automatic presentation", () => {
  it("requires the Opening gesture AND completed Cover exit, never Loading readiness", () => {
    const f = setup();
    f.tick(1000);
    vi.advanceTimersByTime(3000);
    expect(f.controller.state).toBe("idle");
    expect(f.win.scrollTo).not.toHaveBeenCalled();
    f.open();
    f.tick(3000);
    expect(f.controller.state).toBe("waiting");
    expect(f.win.scrollTo).not.toHaveBeenCalled();
    f.ready();
    f.tick(4000);
    f.tick(4500);
    expect(f.controller.state).toBe("running");
    expect(f.top()).toBeGreaterThan(0);
    f.controller.dispose();
  });
  it("visits every Gallery frame and tall traversal, then stops permanently at Closing", () => {
    const f = setup();
    f.open();
    f.ready();
    for (let i = 0; i < f.stops.length; i++) {
      f.tick(i * 2000);
      f.tick(i * 2000 + 500);
      f.tick(i * 2000 + 1000);
      expect(f.top()).toBe(f.stops[i].position);
      if (i < f.stops.length - 1) {
        vi.advanceTimersByTime(1999);
        expect(f.frames.size).toBe(0);
        vi.advanceTimersByTime(1);
      }
    }
    expect(f.controller.state).toBe("finished");
    f.win.dispatchEvent(new Event("ngaturi:open"));
    vi.advanceTimersByTime(60000);
    f.tick(60000);
    expect(f.top()).toBe(2000);
    expect(f.frames.size).toBe(0);
    f.controller.dispose();
  });
  it.each(["wheel", "touchstart", "pointerdown", "cinematic:seek"])(
    "%s cancels movement without a surprise idle resume",
    (event) => {
      const f = setup();
      f.open();
      f.ready();
      f.tick(0);
      f.tick(300);
      const position = f.top();
      (event === "cinematic:seek" ? f.root : f.owner).dispatchEvent(
        new Event(event),
      );
      f.tick(1000);
      vi.advanceTimersByTime(60000);
      f.tick(61000);
      expect(f.controller.state).toBe("paused");
      expect(f.top()).toBe(position);
      f.win.dispatchEvent(new Event("ngaturi:open"));
      f.tick(62000);
      expect(f.top()).toBe(position);
      f.controller.dispose();
    },
  );
  it("cancels scrolling keyboard input and an intervention during Opening exit", () => {
    const f = setup();
    f.open();
    f.owner.dispatchEvent(new KeyboardEvent("keydown"));
    f.ready();
    f.tick(10000);
    expect(f.controller.state).toBe("paused");
    expect(f.top()).toBe(0);
    f.controller.dispose();
  });
  it.each(["Shift", "Tab", "a"])(
    "%s keeps state consistent with the native driver's keyboard cancellation",
    (key) => {
      const f = setup();
      f.open();
      f.ready();
      f.tick(0);
      f.tick(300);
      const position = f.top();
      const event = new KeyboardEvent("keydown");
      Object.defineProperty(event, "key", { value: key });
      f.owner.dispatchEvent(event);
      f.tick(1000);
      expect(f.controller.state).toBe("paused");
      expect(f.top()).toBe(position);
      f.controller.dispose();
    },
  );
  it("form/control focus cancels both travel and a reading hold immediately", () => {
    for (const holding of [false, true]) {
      const f = setup();
      f.open();
      f.ready();
      f.tick(0);
      f.tick(holding ? 1000 : 300);
      const control = new Node();
      control.control = true;
      f.doc.activeElement = control;
      const position = f.top();
      f.doc.dispatchEvent(new Event("focusin"));
      vi.advanceTimersByTime(30000);
      f.tick(30000);
      expect(f.controller.state).toBe("paused");
      expect(f.top()).toBe(position);
      f.controller.dispose();
    }
  });
  it("honors reduced motion before entry and when changed mid-presentation", () => {
    const f = setup();
    f.reduced.matches = true;
    f.open();
    f.ready();
    f.tick(1000);
    expect(f.controller.state).toBe("paused");
    expect(f.top()).toBe(0);
    f.controller.dispose();
    const g = setup();
    g.open();
    g.ready();
    g.tick(0);
    g.tick(300);
    const position = g.top();
    g.reduced.matches = true;
    g.reduced.dispatchEvent(new Event("change"));
    g.tick(1000);
    expect(g.controller.state).toBe("paused");
    expect(g.top()).toBe(position);
    g.controller.dispose();
  });
  it("does not let settling or a layout measurement cancel automatic travel/holds", () => {
    const f = setup();
    f.root.closest = (selector) =>
      selector === ".cinematic-invitation" ? f.root : null;
    const target = vi.fn(() => 450);
    const settle = mountCinematicSettling(
      f.root as unknown as HTMLElement,
      null,
      target,
    );
    f.open();
    f.ready();
    f.tick(0);
    f.tick(500);
    settle.onScroll();
    settle.cancel();
    f.tick(1000);
    settle.onScroll();
    vi.advanceTimersByTime(1500);
    expect(f.top()).toBe(300);
    expect(target).not.toHaveBeenCalled();
    expect(f.controller.state).toBe("running");
    f.controller.dispose();
    settle.dispose();
  });
  it("rechecks a tall content endpoint when measured media grows during travel", () => {
    const f = setup();
    f.open();
    f.ready();
    f.tick(0);
    f.stops[0].position = 500;
    f.tick(1000);
    expect(f.top()).toBe(300);
    f.tick(1100);
    f.tick(2100);
    expect(f.top()).toBe(500);
    f.controller.dispose();
  });
  it("uses only the supplied local owner and removes RAF/timers/listeners on unmount", () => {
    const f = setup(true);
    f.open();
    f.ready();
    f.tick(0);
    f.tick(500);
    expect(f.scroller!.scrollTop).toBeGreaterThan(0);
    expect(f.win.scrollY).toBe(0);
    const position = f.top();
    f.controller.dispose();
    vi.advanceTimersByTime(60000);
    f.tick(60000);
    expect(f.top()).toBe(position);
    expect(f.frames.size).toBe(0);
    expect(f.win.scrollTo).not.toHaveBeenCalled();
  });
  it("does not reactivate after an ordinary remount following manual intervention", () => {
    const f = setup();
    f.open();
    f.ready();
    f.tick(0);
    f.tick(300);
    f.owner.dispatchEvent(new Event("wheel"));
    f.controller.dispose();
    const again = mountCinematicAutoScroll(
      f.root as unknown as HTMLElement,
      null,
      {
        cover: f.cover as unknown as HTMLElement,
        plan: f.plan,
      },
    );
    const top = f.top();
    f.open();
    f.tick(6000);
    expect(again.state).toBe("paused");
    expect(f.top()).toBe(top);
    again.dispose();
  });
  it("leaves failed timeline enhancement manually usable instead of waiting forever", () => {
    const f = setup();
    f.plan.mockReturnValue(null);
    const clock = vi.spyOn(performance, "now").mockReturnValue(0);
    f.open();
    f.ready();
    clock.mockReturnValue(2600);
    f.tick(2600);
    expect(f.controller.state).toBe("paused");
    expect(f.top()).toBe(0);
    clock.mockRestore();
    f.controller.dispose();
  });
  it("yields on hidden tabs and viewport changes rather than resuming into a different layout", () => {
    for (const event of ["visibilitychange", "resize"]) {
      const f = setup();
      f.open();
      f.ready();
      f.tick(0);
      f.tick(300);
      const top = f.top();
      if (event === "visibilitychange") {
        f.doc.hidden = true;
        f.doc.dispatchEvent(new Event(event));
      } else f.win.dispatchEvent(new Event(event));
      f.tick(1000);
      expect(f.controller.state).toBe("paused");
      expect(f.top()).toBe(top);
      f.controller.dispose();
    }
  });
});
