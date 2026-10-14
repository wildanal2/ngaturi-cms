import { afterEach, describe, expect, it, vi } from "vitest";
import {
  animateCinematicScroll,
  cancelCinematicScroll,
  isCinematicScrolling,
} from "./scroll";

function setup() {
  const media = Object.assign(new EventTarget(), { matches: false });
  const win = Object.assign(new EventTarget(), {
    scrollY: 0,
    innerHeight: 800,
    matchMedia: () => media,
    scrollTo: vi.fn(({ top }: { top: number }) => {
      win.scrollY = top;
    }),
  });
  const local = Object.assign(new EventTarget(), {
    scrollTop: 0,
    clientHeight: 400,
    scrollTo: vi.fn(({ top }: { top: number }) => {
      local.scrollTop = top;
    }),
  });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("window", win);
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
  return { win, local, media, tick, frames };
}
afterEach(() => vi.unstubAllGlobals());
describe("Cinematic chapter travel", () => {
  it("renders intermediate owner positions instead of teleporting", () => {
    const f = setup();
    const owner = f.win as unknown as Window;
    const complete = vi.fn(),
      render = vi.fn();
    animateCinematicScroll(owner, 800, {
      duration: 700,
      onFrame: render,
      onComplete: complete,
    });
    expect(f.win.scrollY).toBe(0);
    f.tick(0);
    f.tick(350);
    expect(f.win.scrollY).toBe(400);
    expect(complete).not.toHaveBeenCalled();
    f.tick(700);
    expect(f.win.scrollY).toBe(800);
    expect(complete).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledTimes(3);
    expect(isCinematicScrolling(owner)).toBe(false);
  });
  it.each(["wheel", "touchstart", "keydown"])(
    "cancels on fresh %s input without focusing the destination",
    (type) => {
      const f = setup();
      const complete = vi.fn();
      animateCinematicScroll(f.win as unknown as Window, 800, {
        duration: 700,
        onComplete: complete,
      });
      f.tick(0);
      f.tick(350);
      const position = f.win.scrollY;
      f.win.dispatchEvent(new Event(type));
      f.tick(700);
      expect(f.win.scrollY).toBe(position);
      expect(complete).not.toHaveBeenCalled();
    },
  );
  it("replaces earlier travel and isolates Builder from window", () => {
    const f = setup();
    const owner = f.local as unknown as HTMLElement;
    const obsolete = vi.fn();
    animateCinematicScroll(owner, 500, { duration: 700, onComplete: obsolete });
    f.tick(0);
    f.tick(350);
    animateCinematicScroll(owner, 0, { duration: 700 });
    f.tick(400);
    f.tick(1100);
    expect(f.local.scrollTop).toBe(0);
    expect(f.win.scrollY).toBe(0);
    expect(obsolete).not.toHaveBeenCalled();
    cancelCinematicScroll(owner);
  });
  it("uses instant explicit navigation for reduced motion", () => {
    const f = setup();
    f.media.matches = true;
    const complete = vi.fn();
    animateCinematicScroll(f.win as unknown as Window, 800, {
      onComplete: complete,
    });
    expect(f.win.scrollY).toBe(800);
    expect(f.frames.size).toBe(0);
    expect(complete).toHaveBeenCalledOnce();
  });
  it("cancels when reduced motion changes during travel", () => {
    const f = setup();
    const owner = f.win as unknown as Window;
    animateCinematicScroll(owner, 800);
    f.tick(0);
    f.tick(300);
    const before = f.win.scrollY;
    f.media.matches = true;
    f.media.dispatchEvent(new Event("change"));
    f.tick(1400);
    expect(f.win.scrollY).toBe(before);
    expect(isCinematicScrolling(owner)).toBe(false);
  });
});
