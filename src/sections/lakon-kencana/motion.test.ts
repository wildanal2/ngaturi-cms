import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeLakonEntrance, observeLakonParallax } from "./motion";

class Target extends EventTarget {
  owner: Target | null = null;
  style = { translate: "" };
  clientHeight = 400;
  items: Target[] = [];
  animate = vi.fn((frames: unknown, options: unknown) => {
    void frames;
    void options;
    return { cancel: vi.fn(), id: "" };
  });
  closest(selector: string) {
    return selector === "[data-device-scroller]" ? this.owner : null;
  }
  matches() {
    return true;
  }
  contains() {
    return false;
  }
  querySelectorAll() {
    return this.items;
  }
  getClientRects() {
    return [{}];
  }
  getBoundingClientRect() {
    return { top: 100, height: 200 };
  }
}
const node = (target: Target) => target as unknown as HTMLElement;
let media: EventTarget & { matches: boolean };
let doc: EventTarget & { hidden: boolean; activeElement: Target | null };
let observed: {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit;
  disconnect: ReturnType<typeof vi.fn>;
}[];
let frames: FrameRequestCallback[];
const enter = (index = 0, visible = true) =>
  observed[index].callback(
    [{ isIntersecting: visible }] as IntersectionObserverEntry[],
    {} as IntersectionObserver,
  );
beforeEach(() => {
  observed = [];
  frames = [];
  media = Object.assign(new EventTarget(), { matches: false });
  doc = Object.assign(new EventTarget(), {
    hidden: false,
    activeElement: null as Target | null,
  });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((fn) => {
      frames.push(fn);
      return frames.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor(
        callback: IntersectionObserverCallback,
        options: IntersectionObserverInit,
      ) {
        observed.push({ callback, options, disconnect: this.disconnect });
      }
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Lakon entrance scroll ownership and lifetime", () => {
  it("animates Builder with the nearest native Canvas root, even for tall content, once", () => {
    const target = new Target();
    target.owner = new Target();
    const revealed = vi.fn();
    const clean = observeLakonEntrance(node(target), {
      inCanvas: true,
      onReveal: revealed,
    });
    expect(observed[0].options.root).toBe(target.owner);
    expect(observed[0].options.threshold).toBe(0);
    enter();
    enter();
    expect(target.animate).toHaveBeenCalledTimes(1);
    expect(revealed).toHaveBeenCalledTimes(1);
    expect(observed[0].disconnect).toHaveBeenCalled();
    const animation = target.animate.mock.results[0].value;
    clean();
    expect(animation.cancel).toHaveBeenCalled();
  });
  it("uses the document for public content and never guesses window for a detached Canvas", () => {
    const publicNode = new Target();
    observeLakonEntrance(node(publicNode));
    expect(observed[0].options.root).toBeNull();
    const canvas = new Target();
    observeLakonEntrance(node(canvas), { inCanvas: true });
    expect(observed).toHaveLength(1);
    expect(canvas.animate).not.toHaveBeenCalled();
  });
  it("starts visible content on the first observation without a CSS hidden state", () => {
    const target = new Target();
    const clean = observeLakonEntrance(node(target));
    enter();
    expect(target.style).toEqual({ translate: "" });
    expect(target.animate.mock.calls[0]).toEqual([
      [
        { opacity: 0.25, transform: "translateY(20px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      expect.objectContaining({ duration: 600, fill: "backwards" }),
    ]);
    clean();
  });
  it("cancels motion when a form receives focus and cannot replay while typing", () => {
    const target = new Target();
    const clean = observeLakonEntrance(node(target));
    enter();
    const animation = target.animate.mock.results[0].value;
    target.dispatchEvent(new Event("focusin"));
    enter();
    expect(animation.cancel).toHaveBeenCalled();
    expect(target.animate).toHaveBeenCalledTimes(1);
    clean();
  });
  it("keeps the hero entrance when opening transfers focus to its heading", () => {
    const target = new Target();
    const heading = new Target();
    heading.matches = () => false;
    doc.activeElement = heading;
    target.contains = () => true;
    const clean = observeLakonEntrance(node(target));
    enter();
    expect(target.animate).toHaveBeenCalledTimes(1);
    clean();
  });
  it("cancels active animation when reduced motion changes and detaches its listeners", () => {
    const target = new Target();
    const clean = observeLakonEntrance(node(target));
    enter();
    const animation = target.animate.mock.results[0].value;
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    clean();
    const calls = animation.cancel.mock.calls.length;
    media.dispatchEvent(new Event("change"));
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(animation.cancel).toHaveBeenCalledTimes(calls);
  });
  it.each(["reduced", "observer missing", "observer throws", "animate throws"])(
    "fails visibly open: %s",
    (failure) => {
      const target = new Target();
      if (failure === "reduced") media.matches = true;
      if (failure === "observer missing")
        vi.stubGlobal("IntersectionObserver", undefined);
      if (failure === "observer throws")
        vi.stubGlobal(
          "IntersectionObserver",
          class {
            constructor() {
              throw Error("unavailable");
            }
          },
        );
      if (failure === "animate throws")
        target.animate.mockImplementation(() => {
          throw Error("unavailable");
        });
      const clean = observeLakonEntrance(node(target));
      if (observed.length) expect(() => enter()).not.toThrow();
      expect(target.style).toEqual({ translate: "" });
      clean();
    },
  );
  it("bounds group staggers without animating a group ancestor", () => {
    const target = new Target();
    target.items = [new Target(), new Target(), new Target(), new Target()];
    const clean = observeLakonEntrance(node(target), {
      stagger: true,
      delay: 90,
    });
    enter();
    expect(target.animate).not.toHaveBeenCalled();
    expect(target.items.map((t) => t.animate.mock.calls[0]?.[1])).toEqual(
      [90, 180, 240, 240].map((delay) => expect.objectContaining({ delay })),
    );
    clean();
  });
});

describe("Lakon decorative parallax", () => {
  it("schedules only on visible Canvas scroll and restores transforms on reduction and unmount", () => {
    const target = new Target();
    target.owner = new Target();
    const add = vi.spyOn(target.owner, "addEventListener");
    const remove = vi.spyOn(target.owner, "removeEventListener");
    const clean = observeLakonParallax(node(target), {
      inCanvas: true,
      distance: 12,
    });
    expect(observed[0].options.root).toBe(target.owner);
    expect(frames).toHaveLength(0);
    enter();
    target.owner.dispatchEvent(new Event("scroll"));
    expect(frames).toHaveLength(1);
    frames[0](0);
    expect(target.style.translate).not.toBe("");
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); // No permanent loop.
    enter(0, false);
    expect(target.style.translate).toBe("");
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    enter();
    frames.at(-1)!(0);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(target.style.translate).toBe("");
    clean();
    expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    expect(observed[0].disconnect).toHaveBeenCalled();
  });
  it("does not attach decorations when reduced motion is requested", () => {
    media.matches = true;
    observeLakonParallax(node(new Target()), { distance: 12 });
    expect(observed).toHaveLength(0);
    expect(frames).toHaveLength(0);
  });
});
