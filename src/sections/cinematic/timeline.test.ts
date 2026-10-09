import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCinematicTimeline } from "./timeline";
import { cinematicAutoPlan } from "./auto-scroll-plan";
import { isCinematicScrolling } from "./scroll";

const motion = vi.hoisted(() => {
  let duration = 0;
  let now = 0;
  const tween = vi.fn(
    (_target: unknown, vars: Record<string, unknown>, at = 0) => {
      duration = Math.max(duration, at + Number(vars.duration ?? 0));
    },
  );
  return {
    timeline: {
      fromTo: vi.fn(
        (
          target: unknown,
          _from: unknown,
          to: Record<string, unknown>,
          at = 0,
        ) => tween(target, to, at),
      ),
      to: tween,
      progress: vi.fn((value: number) => {
        now = duration * value;
      }),
      time: () => now,
      duration: () => duration,
      invalidate: vi.fn(),
      kill: vi.fn(),
    },
    revert: vi.fn(),
    reset: () => {
      duration = 0;
      now = 0;
    },
  };
});
vi.mock("gsap", () => ({
  gsap: {
    context: () => ({ add: (run: () => void) => run(), revert: motion.revert }),
    timeline: () => motion.timeline,
    set: vi.fn(),
  },
}));

// Layout comes from measured DOM sizes; GSAP itself is not under test.
class Element extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  css = new Map<string, string>();
  style = {
    height: "",
    translate: "",
    setProperty: (key: string, value: string) => this.css.set(key, value),
    removeProperty: (key: string) => {
      if (key === "height") this.style.height = "";
      this.css.delete(key);
    },
  };
  children: Element[] = [];
  parentElement: Element | null = null;
  nextElementSibling: Element | null = null;
  previousElementSibling: Element | null = null;
  queries = new Map<string, Element[]>();
  offsetHeight = 300;
  scrollHeight = 300;
  clientWidth = 360;
  clientHeight = 800;
  scrollTop = 0;
  inert = false;
  computed = {
    paddingTop: "0",
    paddingBottom: "0",
    marginTop: "0",
    marginBottom: "0",
  };
  get firstElementChild(): Element | null {
    return this.children[0] ?? null;
  }
  get lastElementChild(): Element | null {
    return this.children.at(-1) ?? null;
  }
  append(child: Element) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  querySelector(selector: string) {
    return this.queries.get(selector)?.[0] ?? null;
  }
  querySelectorAll(selector: string) {
    return this.queries.get(selector) ?? [];
  }
  hasAttribute(key: string) {
    return this.attributes.has(key);
  }
  getAttribute(key: string) {
    return (
      this.attributes.get(key) ??
      (key === "data-section-id" ? this.dataset.sectionId : null) ??
      null
    );
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  removeAttribute(key: string) {
    this.attributes.delete(key);
  }
  toggleAttribute(key: string, force: boolean) {
    if (force) this.setAttribute(key, "");
    else this.removeAttribute(key);
  }
  closest(selector: string): Element | null {
    if (
      (selector === '[data-scene="world"]' && this.dataset.scene === "world") ||
      (selector === "[data-section]" && this.dataset.section) ||
      (selector === "[data-section-id]" && this.dataset.sectionId)
    )
      return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  getBoundingClientRect() {
    return {
      top: 0,
      bottom: this.clientHeight,
      left: 0,
      right: this.clientWidth,
    };
  }
  scrollTo = vi.fn(({ top }: { top: number }) => {
    this.scrollTop = top;
  });
}

function setup({ width = 360, height = 800, local = false } = {}) {
  const root = new Element();
  root.clientWidth = width;
  const viewport = new Element();
  viewport.clientWidth = width;
  viewport.clientHeight = height;
  const scene = (kind: string, section: string, size: number) => {
    const node = root.append(new Element());
    node.dataset = { scene: kind, section, sectionId: `${kind}-id` };
    const body = node.append(new Element());
    const content = body.append(new Element());
    content.offsetHeight = content.scrollHeight = size;
    return { node, body, content };
  };
  const hero = scene("entrance", "hero", 500);
  hero.node.queries.set("[data-hero-photo]", [new Element()]);
  const couple = scene("couple", "couple-intro", 925);
  const quote = scene("quote", "quote", 420);
  const countdown = scene("countdown", "countdown", 469);
  const world = scene("world", "", 300);
  const venue = scene("venue", "map-location", 500);
  delete world.node.dataset.section;
  const gallery = world.body.append(new Element());
  gallery.dataset = { section: "gallery", sectionId: "gallery-id" };
  const events = world.body.append(new Element());
  events.dataset = { section: "event-details", sectionId: "event-id" };
  const panel = (parent: Element, size: number, event = false) => {
    const node = parent.append(new Element());
    if (event) node.setAttribute("data-event-portal", "");
    const frame = node.append(new Element());
    frame.append(new Element()); // Heritage frame decoration.
    const body = frame.append(new Element());
    const content = body.append(new Element());
    content.offsetHeight = content.scrollHeight = size;
    return { node, body, content };
  };
  const photo = panel(gallery, 300);
  const portal = panel(events, 1100, true);
  const rail = new Element();
  const image = new Element();
  root.queries.set("[data-cinematic-viewport]", [viewport]);
  root.queries.set("[data-scene]", [
    hero.node,
    couple.node,
    quote.node,
    countdown.node,
    world.node,
    venue.node,
  ]);
  root.queries.set("[data-world-panel]", [photo.node, portal.node]);
  root.queries.set("[data-world-rail]", [rail]);
  root.queries.set("[data-world-camera]", [new Element()]);
  root.queries.set("img", [image]);
  const win = Object.assign(new Element(), {
    innerHeight: 900,
    scrollY: 0,
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
  });
  win.scrollTo = vi.fn(({ top }) => {
    win.scrollY = top;
  });
  if (!local) win.innerHeight = height;
  const scroller = local ? new Element() : null;
  if (scroller) scroller.clientHeight = height;
  vi.stubGlobal("window", win);
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), {
      documentElement: new Element(),
      activeElement: null,
    }),
  );
  vi.stubGlobal("HTMLElement", Element);
  vi.stubGlobal(
    "KeyboardEvent",
    class extends Event {
      key = "";
    },
  );
  vi.stubGlobal("getComputedStyle", (node: Element) => node.computed);
  const disconnect = vi.fn();
  const observed = new Set<Element>();
  let resize = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe(node: Element) {
        observed.add(node);
      }
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const mount = () =>
    mountCinematicTimeline(
      root as unknown as HTMLElement,
      scroller as unknown as HTMLElement | null,
    );
  const seek = (id: string) => {
    const event = new CustomEvent("cinematic:seek", {
      detail: id,
      cancelable: true,
    });
    root.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return {
    root,
    viewport,
    photo,
    couple,
    portal,
    rail,
    win,
    scroller,
    image,
    mount,
    seek,
    disconnect,
    observed,
    resize: () => resize(),
  };
}

function storyFixture(local = false) {
  const f = setup({ local });
  const scene = f.root.append(new Element());
  scene.dataset = { scene: "story", section: "story", sectionId: "story-id" };
  const body = scene.append(new Element());
  const heading = body.append(new Element());
  heading.offsetHeight = 80;
  body.queries.set("[data-story-heading]", [heading]);
  const stack = body.append(new Element());
  const memories = [300, 1600, 400].map((size) => {
    const node = stack.append(new Element());
    const frame = node.append(new Element());
    frame.append(new Element());
    const reader = frame.append(new Element());
    const content = reader.append(new Element());
    content.offsetHeight = content.scrollHeight = size;
    return { node, reader };
  });
  const nodes = memories.map((m) => m.node);
  scene.queries.set("[data-story-memory]", nodes);
  f.root.queries.set("[data-story-memory]", nodes);
  const scenes = f.root.queries.get("[data-scene]")!;
  scenes.splice(3, 0, scene);
  return { ...f, memories };
}

beforeEach(() => {
  vi.clearAllMocks();
  motion.reset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Cinematic outer-scroll regression", () => {
  it("refreshes a later stage's seek origin when preceding natural content grows", () => {
    const f = setup();
    const interactions = new Element();
    f.root.previousElementSibling = interactions;
    let precedingHeight = 0;
    vi.spyOn(f.root, "getBoundingClientRect").mockImplementation(() => ({
      top: precedingHeight - f.win.scrollY,
      bottom: precedingHeight - f.win.scrollY + f.root.clientHeight,
      left: 0,
      right: 360,
    }));
    const cleanup = f.mount();
    expect(f.observed.has(interactions)).toBe(true);
    f.seek("couple-id");
    const originalDestination = f.win.scrollY;
    precedingHeight += 500;
    f.resize();
    f.seek("couple-id");
    expect(f.win.scrollY).toBe(originalDestination + 500);
    cleanup?.();
  });

  it("measures only the active world and retains off-camera focus protection", () => {
    const f = setup();
    const photo = vi.spyOn(f.photo.node, "getBoundingClientRect");
    const portal = vi.spyOn(f.portal.node, "getBoundingClientRect");
    const view = vi.spyOn(f.viewport, "getBoundingClientRect");
    portal.mockReturnValue({ top: 0, bottom: 800, left: 1000, right: 1360 });
    const cleanup = f.mount();
    expect(photo).not.toHaveBeenCalled();
    expect(portal).not.toHaveBeenCalled();
    expect(f.photo.node.inert).toBe(true);
    expect(f.portal.node.inert).toBe(true);
    expect(f.seek("gallery-id")).toBe(true);
    expect(photo).toHaveBeenCalledOnce();
    expect(portal).toHaveBeenCalledOnce();
    expect(view).toHaveBeenCalledOnce();
    expect(f.photo.node.inert).toBe(false);
    expect(f.portal.node.inert).toBe(true);
    expect(f.root.dataset.activeSection).toBe("gallery");
    photo.mockClear();
    portal.mockClear();
    f.seek("venue-id");
    expect(photo).not.toHaveBeenCalled();
    expect(portal).not.toHaveBeenCalled();
    expect(f.photo.node.inert).toBe(true);
    expect(f.root.dataset.activeSection).toBe("map-location");
    cleanup?.();
  });
  it("batches panel reads before focusability writes", () => {
    const f = setup();
    const cleanup = f.mount();
    const operations: string[] = [];
    for (const [name, node] of [
      ["photo", f.photo.node],
      ["portal", f.portal.node],
    ] as const) {
      const rect = node.getBoundingClientRect.bind(node);
      vi.spyOn(node, "getBoundingClientRect").mockImplementation(() => {
        operations.push(`read:${name}`);
        return rect();
      });
      let inactive = node.inert;
      Object.defineProperty(node, "inert", {
        get: () => inactive,
        set: (value: boolean) => {
          operations.push(`focus:${name}`);
          inactive = value;
        },
      });
    }
    f.seek("gallery-id");
    expect(operations).toEqual([
      "read:photo",
      "read:portal",
      "focus:photo",
      "focus:portal",
    ]);
    cleanup?.();
  });

  it("cancels an in-flight chapter seek when its timeline unmounts", () => {
    const f = setup();
    const cleanup = f.mount();
    f.root.dispatchEvent(
      new CustomEvent("cinematic:seek", {
        detail: { sectionId: "couple-id", behavior: "smooth" },
        cancelable: true,
      }),
    );
    expect(isCinematicScrolling(f.win as unknown as Window)).toBe(true);
    cleanup?.();
    expect(isCinematicScrolling(f.win as unknown as Window)).toBe(false);
  });
  it("registers measured automatic reading beats and releases them with the timeline", () => {
    const f = setup();
    f.root.setAttribute("data-cinematic-stage", "");
    const host = new Element();
    host.queries.set("[data-cinematic-stage], [data-cinematic-interaction]", [
      f.root,
    ]);
    (document.documentElement as unknown as Element).scrollHeight = 50000;
    const cleanup = f.mount();
    const plan = cinematicAutoPlan(host as unknown as HTMLElement, null)!;
    const couple = plan.filter(
      (stop) => stop.node === (f.couple.node as unknown as HTMLElement),
    );
    const event = plan.filter(
      (stop) => stop.node === (f.portal.node as unknown as HTMLElement),
    );
    expect(couple).toHaveLength(2);
    expect(event).toHaveLength(2);
    expect(couple[1].position - couple[0].position).toBe(245);
    expect(event[1].position - event[0].position).toBe(420);
    expect(couple[1].reading).toBe(true);
    expect(event[1].reading).toBe(true);
    expect(
      plan.some(
        (stop) =>
          stop.node.closest<HTMLElement>("[data-section]")?.dataset.section ===
          "gallery",
      ),
    ).toBe(true);
    expect(
      plan.every(
        (stop, index) =>
          index === 0 || stop.position >= plan[index - 1].position,
      ),
    ).toBe(true);
    cleanup?.();
    expect(cinematicAutoPlan(host as unknown as HTMLElement, null)).toBeNull();
  });
  it.each([false, true])(
    "traverses each tall Story memory on the owner before Countdown (local: %s)",
    (local) => {
      vi.useFakeTimers();
      const f = storyFixture(local);
      const frames = new Map<number, FrameRequestCallback>();
      let id = 0;
      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          frames.set(++id, callback);
          return id;
        },
      );
      vi.stubGlobal("cancelAnimationFrame", (key: number) =>
        frames.delete(key),
      );
      const tick = (now: number) => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(now));
      };
      const cleanup = f.mount();
      expect(f.seek("story-id")).toBe(true);
      expect(f.root.dataset.activeSection).toBe("story");
      expect(
        f.memories.map((m) => m.node.hasAttribute("data-cinematic-tall")),
      ).toEqual([false, true, false]);
      expect(
        f.memories.every(
          (m) => !m.reader.hasAttribute("data-cinematic-reading"),
        ),
      ).toBe(true);
      const owner = f.scroller ?? f.win;
      const firstRest = local ? owner.scrollTop : f.win.scrollY;
      const baseDistance = ((motion.timeline.duration() - 1) / 8) * 800;
      const secondRest =
        firstRest + (6 / motion.timeline.duration()) * baseDistance;
      if (local) owner.scrollTop = secondRest;
      else f.win.scrollY = secondRest;
      owner.dispatchEvent(new Event("scroll"));
      tick(0);
      expect(f.memories.map((m) => m.node.inert)).toEqual([true, false, true]);
      const restingTime = motion.timeline.time();
      owner.dispatchEvent(new Event("wheel"));
      if (local) owner.scrollTop += 40;
      else f.win.scrollY += 40;
      owner.dispatchEvent(new Event("scroll"));
      tick(0);
      expect(motion.timeline.time()).toBeCloseTo(restingTime);
      expect(f.memories[1].node.style.translate).toBe("0 -40px");
      vi.advanceTimersByTime(300);
      tick(0);
      tick(450);
      expect(local ? owner.scrollTop : f.win.scrollY).toBeCloseTo(
        secondRest + 40,
      );
      expect(f.root.dataset.activeSection).toBe("story");
      expect(f.seek("countdown-id")).toBe(true);
      expect(f.root.dataset.activeSection).toBe("countdown");
      if (local) expect(f.win.scrollTo).not.toHaveBeenCalled();
      cleanup?.();
      expect(
        f.memories.every(
          (m) =>
            !m.node.inert &&
            !m.node.hasAttribute("data-cinematic-tall") &&
            m.node.style.translate === "",
        ),
      ).toBe(true);
    },
  );
  it("releases every Story memory in short landscape and restores cinematic holds on portrait resize", () => {
    const f = storyFixture();
    f.root.clientWidth = 512;
    f.win.innerHeight = 390;
    const cleanup = f.mount();
    expect(f.root.hasAttribute("data-linear")).toBe(true);
    expect(
      f.memories.every(
        (m) =>
          !m.node.inert && !m.node.hasAttribute("data-cinematic-tall"),
      ),
    ).toBe(true);
    f.win.innerHeight = 800;
    f.resize();
    expect(f.root.hasAttribute("data-linear")).toBe(false);
    expect(f.seek("story-id")).toBe(true);
    expect(f.memories[1].node.hasAttribute("data-cinematic-tall")).toBe(true);
    cleanup?.();
  });
  it.each(["entry", "tail"])(
    "settles the visible stage %s instead of rejecting it by timeline bounds",
    (edge) => {
      vi.useFakeTimers();
      const f = setup();
      const frames = new Map<number, FrameRequestCallback>();
      let id = 0;
      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          frames.set(++id, callback);
          return id;
        },
      );
      vi.stubGlobal("cancelAnimationFrame", (key: number) =>
        frames.delete(key),
      );
      const tick = (now: number) => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(now));
      };
      const rect = f.root.getBoundingClientRect();
      f.root.getBoundingClientRect = () => ({
        ...rect,
        top: 73 - f.win.scrollY,
        bottom: 73 - f.win.scrollY + (parseFloat(f.root.style.height) || 800),
      });
      const next = new Element();
      next.queries.set("[data-cinematic-interaction]", [new Element()]);
      next.getBoundingClientRect = () => ({
        ...rect,
        top: 73 + parseFloat(f.root.style.height) - f.win.scrollY,
      });
      f.root.nextElementSibling = next;
      const cleanup = f.mount();
      if (edge === "entry") f.win.scrollY = 0;
      else f.win.scrollY = 73 + parseFloat(f.root.style.height) - 350;
      f.win.dispatchEvent(new Event("scroll"));
      tick(0);
      const before = f.win.scrollY;
      f.win.dispatchEvent(new Event("wheel"));
      f.win.scrollY += 35;
      f.win.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(300);
      tick(0);
      tick(450);
      if (edge === "entry") expect(f.win.scrollY).toBeGreaterThan(before + 35);
      else expect(f.win.scrollY).toBe(73 + parseFloat(f.root.style.height));
      cleanup?.();
    },
  );
  it("animates structured chapter seeks and retains instant legacy Builder seeks", () => {
    const f = setup();
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
    const tick = (now: number) => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    };
    const cleanup = f.mount();
    const event = new CustomEvent("cinematic:seek", {
      detail: { sectionId: "couple-id", behavior: "smooth" },
      cancelable: true,
    });
    f.root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(f.win.scrollY).toBe(0);
    tick(0);
    tick(350);
    const halfway = f.win.scrollY;
    expect(halfway).toBeGreaterThan(0);
    tick(1400);
    expect(f.win.scrollY).toBeGreaterThan(halfway);
    const calls = f.win.scrollTo.mock.calls.length;
    f.seek("entrance-id");
    expect(f.win.scrollTo.mock.calls.length).toBe(calls + 1);
    cleanup?.();
  });
  it.each([false, true])(
    "settles manual input to the actual timeline beat (local scroller: %s)",
    (local) => {
      vi.useFakeTimers();
      const f = setup({ local });
      const frames = new Map<number, FrameRequestCallback>();
      let id = 0;
      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          frames.set(++id, callback);
          return id;
        },
      );
      vi.stubGlobal("cancelAnimationFrame", (key: number) =>
        frames.delete(key),
      );
      const tick = (now: number) => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(now));
      };
      const cleanup = f.mount();
      f.seek("entrance-id");
      const rest = f.scroller ? f.scroller.scrollTop : f.win.scrollY;
      const owner = f.scroller ?? f.win;
      owner.dispatchEvent(new Event("wheel"));
      if (f.scroller) f.scroller.scrollTop = rest + 80;
      else f.win.scrollY = rest + 80;
      owner.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(300);
      tick(0);
      tick(450);
      expect(f.scroller ? f.scroller.scrollTop : f.win.scrollY).toBe(rest);
      if (local) expect(f.win.scrollTo).not.toHaveBeenCalled();
      cleanup?.();
    },
  );
  it.each([false, true])(
    "keeps oversized content on the owner and preserves cinematic seek (local scroller: %s)",
    (local) => {
      const f = setup({ local });
      const cleanup = f.mount();
      expect(f.root.hasAttribute("data-linear")).toBe(false);
      expect(f.couple.node.hasAttribute("data-cinematic-tall")).toBe(true);
      expect(f.portal.node.hasAttribute("data-cinematic-tall")).toBe(true);
      expect(f.couple.body.hasAttribute("data-cinematic-reading")).toBe(false);
      expect(f.portal.body.hasAttribute("data-cinematic-reading")).toBe(false);
      for (const chapter of [
        "entrance-id",
        "couple-id",
        "quote-id",
        "countdown-id",
        "gallery-id",
        "event-id",
        "venue-id",
      ])
        expect(f.seek(chapter)).toBe(true);
      expect(
        motion.timeline.to.mock.calls.some(
          ([target, vars]) => target === f.rail && "x" in vars,
        ),
      ).toBe(true);
      expect((f.scroller ?? f.win).scrollTo).toHaveBeenCalled();
      if (local) expect(f.win.scrollTo).not.toHaveBeenCalled();
      cleanup?.();
    },
  );

  it("does not treat a short portrait Builder viewport as landscape", () => {
    const f = setup({ height: 533, local: true });
    const cleanup = f.mount();
    expect(f.root.hasAttribute("data-linear")).toBe(false);
    expect(f.seek("couple-id")).toBe(true);
    cleanup?.();
  });

  it("keeps the separate final Closing cinematic and reachable with tall portrait content", () => {
    const f = setup({ height: 533, local: true });
    const closing = new Element();
    closing.dataset = {
      scene: "closing",
      section: "closing",
      sectionId: "closing-id",
    };
    const body = closing.append(new Element());
    const content = body.append(new Element());
    content.offsetHeight = content.scrollHeight = 925;
    f.root.queries.set("[data-scene]", [closing]);
    f.root.queries.set("[data-world-panel]", []);
    const cleanup = f.mount();
    expect(f.root.hasAttribute("data-linear")).toBe(false);
    expect(closing.hasAttribute("data-cinematic-tall")).toBe(true);
    expect(body.hasAttribute("data-cinematic-reading")).toBe(false);
    expect(f.seek("closing-id")).toBe(true);
    expect(
      motion.timeline.to.mock.calls.some(
        ([target, vars]) => target === closing && vars.autoAlpha === 0,
      ),
    ).toBe(false);
    cleanup?.();
  });

  it.each([false, true])(
    "settles after the final Closing pan without rewinding its message (local: %s)",
    (local) => {
      vi.useFakeTimers();
      const f = setup({ local });
      const closing = new Element();
      closing.dataset = {
        scene: "closing",
        section: "closing",
        sectionId: "closing-id",
      };
      const body = closing.append(new Element());
      const content = body.append(new Element());
      content.offsetHeight = content.scrollHeight = 1600;
      f.root.queries.set("[data-scene]", [closing]);
      f.root.queries.set("[data-world-panel]", []);
      const frames = new Map<number, FrameRequestCallback>();
      let id = 0;
      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          frames.set(++id, callback);
          return id;
        },
      );
      vi.stubGlobal("cancelAnimationFrame", (key: number) =>
        frames.delete(key),
      );
      const tick = (now: number) => {
        const pending = [...frames.values()]; frames.clear();
        pending.forEach((callback) => callback(now));
      };
      const cleanup = f.mount();
      const owner = f.scroller ?? f.win;
      const top = () => (local ? owner.scrollTop : f.win.scrollY);
      const setTop = (value: number) => {
        if (local) owner.scrollTop = value; else f.win.scrollY = value;
      };
      f.root.dispatchEvent(
        new CustomEvent("cinematic:seek", {
          detail: { sectionId: "closing-id", behavior: "smooth" },
          cancelable: true,
        }),
      );
      tick(0);
      tick(1400);
      const start = top();
      const pan = 1600 - (800 - 120);
      owner.dispatchEvent(new Event("wheel"));
      setTop(start + pan / 2);
      owner.dispatchEvent(new Event("scroll")); tick(0);
      vi.advanceTimersByTime(300); tick(0); tick(450);
      expect(top()).toBe(start + pan / 2);
      expect(body.hasAttribute("data-cinematic-reading")).toBe(false);
      owner.dispatchEvent(new Event("wheel"));
      setTop(start + pan + 50);
      owner.dispatchEvent(new Event("scroll")); tick(0);
      vi.advanceTimersByTime(300); tick(0); tick(450);
      expect(top()).toBe(start + pan);
      expect(closing.style.translate).toBe(`0 -${pan}px`);
      expect(f.root.dataset.activeSection).toBe("closing");
      if (local) expect(f.win.scrollTo).not.toHaveBeenCalled();
      cleanup?.();
    },
  );

  it("releases outer travel when content shrinks without leaving stale transforms", () => {
    const f = setup();
    const cleanup = f.mount();
    f.portal.body.offsetHeight = 400; // Actual content stays 1100px tall.
    for (let i = 0; i < 5; i++) f.resize();
    expect(f.portal.node.hasAttribute("data-cinematic-tall")).toBe(true);
    expect(f.root.hasAttribute("data-linear")).toBe(false);
    f.portal.content.offsetHeight = f.portal.content.scrollHeight = 100;
    f.couple.content.offsetHeight = f.couple.content.scrollHeight = 100;
    f.resize();
    expect(f.portal.node.hasAttribute("data-cinematic-tall")).toBe(false);
    expect(f.portal.node.style.translate).toBe("");
    expect(f.couple.body.hasAttribute("tabindex")).toBe(false);
    expect(f.seek("event-id")).toBe(true);
    cleanup?.();
  });

  it("reserves whole-stage fallback for short landscape and recovers on portrait resize", () => {
    const f = setup({ width: 512, height: 390 });
    const cleanup = f.mount();
    expect(f.root.hasAttribute("data-linear")).toBe(true);
    expect(f.root.style.height).toBe("auto");
    expect(f.seek("gallery-id")).toBe(false);
    expect(f.couple.node.inert).toBe(false);
    f.win.innerHeight = 800;
    f.resize();
    expect(f.root.hasAttribute("data-linear")).toBe(false);
    expect(f.seek("gallery-id")).toBe(true);
    cleanup?.();
  });

  it("cleans up outer travel, observers, and seek/scroll/image listeners", () => {
    const f = setup();
    f.couple.body.setAttribute("tabindex", "-1");
    f.couple.body.setAttribute("aria-label", "Original label");
    const cleanup = f.mount();
    expect(f.portal.body.getAttribute("tabindex")).toBe(null);
    expect(f.couple.node.hasAttribute("data-cinematic-tall")).toBe(true);
    cleanup?.();
    expect(f.couple.body.getAttribute("tabindex")).toBe("-1");
    expect(f.couple.body.getAttribute("aria-label")).toBe("Original label");
    expect(f.portal.body.hasAttribute("role")).toBe(false);
    expect(f.portal.body.hasAttribute("data-cinematic-reading")).toBe(false);
    expect(f.couple.node.hasAttribute("data-cinematic-tall")).toBe(false);
    expect(f.portal.node.style.translate).toBe("");
    expect(f.disconnect).toHaveBeenCalledOnce();
    expect(motion.timeline.kill).toHaveBeenCalledOnce();
    expect(motion.revert).toHaveBeenCalledOnce();
    const renders = motion.timeline.progress.mock.calls.length;
    f.resize();
    f.image.dispatchEvent(new Event("load"));
    f.win.dispatchEvent(new Event("scroll"));
    expect(f.seek("gallery-id")).toBe(false);
    expect(motion.timeline.progress).toHaveBeenCalledTimes(renders);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
