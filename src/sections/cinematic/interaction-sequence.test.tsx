import { afterEach, describe, expect, it, vi } from "vitest";
import { InteractionSequence } from "./interaction-sequence";

const hooks = vi.hoisted(() => ({
  root: null as unknown,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useRef: () => ({ current: hooks.root }),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));
afterEach(() => {
  hooks.effects = [];
  hooks.root = null;
  vi.unstubAllGlobals();
});
function setup() {
  const values = new Map<string, string>();
  const operations: string[] = [];
  const style = {
    setProperty: vi.fn((key: string, value: string) => {
      operations.push(`write:${key}`);
      values.set(key, value);
    }),
    removeProperty: (key: string) => values.delete(key),
  };
  const environment = { style };
  const root = Object.assign(new EventTarget(), {
    dataset: {} as Record<string, string>,
    clientWidth: 390,
    querySelector: () => environment,
    querySelectorAll: (selector: string) =>
      selector === "[data-cinematic-interaction]" ? [chapter] : [],
    getBoundingClientRect: () => {
      operations.push("read:root");
      return { top: -100, bottom: 1500, height: 1600 };
    },
    contains: (node: unknown) => node === control,
    style: { setProperty: vi.fn() },
  });
  const chapter = {
    dataset: { section: "rsvp" },
    getBoundingClientRect: () => {
      operations.push("read:chapter");
      return { top: 0, bottom: 900 };
    },
  };
  class Control {
    closest() {
      return this;
    }
  }
  const control = new Control();
  const doc = { activeElement: null as Control | null };
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const owner = Object.assign(new EventTarget(), {
    innerHeight: 844,
    matchMedia: () => reduced,
  });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("window", owner);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLElement", Control);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  hooks.root = root;
  const mount = () => {
    InteractionSequence({ children: null });
    return hooks.effects[0]();
  };
  const update = () => {
    owner.dispatchEvent(new Event("scroll"));
    for (const [key, callback] of frames) {
      frames.delete(key);
      callback(0);
    }
  };
  return {
    root,
    style,
    values,
    operations,
    doc,
    control,
    owner,
    reduced,
    frames,
    mount,
    update,
  };
}
describe("Cinematic interaction environment performance", () => {
  it("keeps animated variables out of the form subtree and reads before writes", () => {
    const f = setup();
    const cleanup = f.mount();
    expect(f.root.style.setProperty).not.toHaveBeenCalled();
    expect([...f.values.keys()]).toEqual([
      "--salon-height",
      "--interaction-depth",
      "--salon-light",
    ]);
    expect(f.operations.slice(0, 2)).toEqual(["read:root", "read:chapter"]);
    f.operations.length = 0;
    f.style.setProperty.mockClear();
    f.update();
    expect(
      f.style.setProperty.mock.calls.some(([key]) => key === "--salon-height"),
    ).toBe(false);
    expect(f.operations.slice(0, 2)).toEqual(["read:root", "read:chapter"]);
    cleanup?.();
    expect(f.values.size).toBe(0);
    f.owner.dispatchEvent(new Event("scroll"));
    expect(f.frames.size).toBe(0);
  });
  it("freezes depth during interaction and respects reduced motion", () => {
    const f = setup();
    const cleanup = f.mount();
    f.style.setProperty.mockClear();
    f.doc.activeElement = f.control;
    f.update();
    expect(f.style.setProperty).not.toHaveBeenCalled();
    f.doc.activeElement = null;
    f.reduced.matches = true;
    f.reduced.dispatchEvent(new Event("change"));
    f.update();
    expect(f.values.has("--interaction-depth")).toBe(false);
    cleanup?.();
  });
});
