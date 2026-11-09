import { afterEach, describe, expect, it, vi } from "vitest";
import { openingHandoff } from "./opening-handoff";

function fixture(inCanvas = false) {
  const frames = new Map<number, FrameRequestCallback>();
  const doc = new EventTarget();
  const view = Object.assign(new EventTarget(), {
    scrollY: 100,
    scrollTo: vi.fn(),
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(1, callback);
      return 1;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  });
  const device = Object.assign(new EventTarget(), {
    scrollTop: 50,
    scrollTo: vi.fn(),
    getBoundingClientRect: () => ({ top: 20 }),
  });
  const target = {
    isConnected: true,
    focus: vi.fn(),
    getBoundingClientRect: () => ({ top: 900 }),
  };
  const surface = {
    ownerDocument: Object.assign(doc, { defaultView: view }),
    querySelector: () => target,
    closest: () => (inCanvas ? device : null),
  } as unknown as HTMLElement;
  return {
    doc,
    view,
    device,
    target,
    surface,
    flush: () => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(0));
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Gerbang Puspa opening ownership", () => {
  it("hands off once on the next frame, with no delayed focus or second scroll", () => {
    vi.useFakeTimers();
    const f = fixture();
    openingHandoff(f.surface, false);
    expect(f.target.focus).not.toHaveBeenCalled();
    f.flush();
    expect(f.target.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(f.view.scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 1000,
      behavior: "smooth",
    });
    vi.runAllTimers();
    f.doc.dispatchEvent(new Event("wheel"));
    expect(f.view.scrollTo).toHaveBeenCalledTimes(1);
    expect(f.target.focus).toHaveBeenCalledTimes(1);
  });
  it.each(["wheel", "touchstart", "pointerdown", "keydown"])(
    "lets an immediate %s cancel the pending handoff",
    (gesture) => {
      const f = fixture();
      openingHandoff(f.surface, false);
      f.doc.dispatchEvent(new Event(gesture));
      f.flush();
      expect(f.target.focus).not.toHaveBeenCalled();
      expect(f.view.scrollTo).not.toHaveBeenCalled();
    },
  );
  it("stops a running smooth handoff at the user's current scroll position", () => {
    const f = fixture();
    openingHandoff(f.surface, false);
    f.flush();
    f.view.scrollY = 240;
    f.doc.dispatchEvent(new Event("touchstart"));
    expect(f.view.scrollTo).toHaveBeenLastCalledWith({
      top: 240,
      behavior: "instant",
    });
    f.doc.dispatchEvent(new Event("wheel"));
    expect(f.view.scrollTo).toHaveBeenCalledTimes(2);
  });
  it("uses the device scroll owner and immediate motion when requested", () => {
    const f = fixture(true);
    openingHandoff(f.surface, true);
    f.flush();
    expect(f.device.scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 930,
      behavior: "instant",
    });
    expect(f.view.scrollTo).not.toHaveBeenCalled();
  });
  it("cleans up when unmounted before the next frame or when the Hero disappears", () => {
    const f = fixture();
    const cleanup = openingHandoff(f.surface, false);
    cleanup();
    f.flush();
    expect(f.target.focus).not.toHaveBeenCalled();
    const other = fixture();
    openingHandoff(other.surface, false);
    other.target.isConnected = false;
    other.flush();
    expect(other.view.scrollTo).not.toHaveBeenCalled();
  });
  it("releases gesture listeners when the initial scroll completes", () => {
    const f = fixture();
    openingHandoff(f.surface, false);
    f.flush();
    f.view.dispatchEvent(new Event("scrollend"));
    f.doc.dispatchEvent(new Event("pointerdown"));
    expect(f.view.scrollTo).toHaveBeenCalledTimes(1);
  });
});
