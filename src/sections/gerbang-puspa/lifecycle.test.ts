import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpeningLifecycle,
  GP_OPENING_MS,
  holdClosedEntry,
} from "./lifecycle";

afterEach(() => vi.useRealTimers());

describe("Gerbang Puspa entry lifecycle", () => {
  it("authorizes synchronously, ignores repeated taps and completes without animation callbacks", () => {
    vi.useFakeTimers();
    const stages = vi.fn();
    const machine = createOpeningLifecycle("closed", stages);
    const gesture = vi.fn();
    expect(machine.begin(gesture)).toBe(true);
    expect(gesture).toHaveBeenCalledOnce();
    expect(machine.getStage()).toBe("opening");
    expect(machine.begin(gesture)).toBe(false);
    vi.advanceTimersByTime(GP_OPENING_MS);
    expect(machine.getStage()).toBe("opened");
    expect(stages.mock.calls).toEqual([["opening"], ["opened"]]);
    machine.complete();
    expect(machine.begin(gesture)).toBe(false);
    expect(gesture).toHaveBeenCalledOnce();
    expect(stages).toHaveBeenCalledTimes(2);
  });
  it("animation completion and the fallback cannot publish opened twice", () => {
    vi.useFakeTimers();
    const stages = vi.fn();
    const machine = createOpeningLifecycle("closed", stages);
    machine.begin(() => {});
    machine.complete();
    vi.runAllTimers();
    expect(stages.mock.calls).toEqual([["opening"], ["opened"]]);
  });
  it("reduced motion reaches functional parity immediately, even if playback fails", () => {
    vi.useFakeTimers();
    const machine = createOpeningLifecycle("closed", vi.fn());
    expect(
      machine.begin(() => {
        throw new Error("playback denied");
      }, true),
    ).toBe(true);
    expect(machine.getStage()).toBe("opened");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("Builder/no-cover entry stays open and unmount cancels pending notifications", () => {
    vi.useFakeTimers();
    const opened = createOpeningLifecycle("opened", vi.fn());
    const gesture = vi.fn();
    expect(opened.begin(gesture)).toBe(false);
    expect(gesture).not.toHaveBeenCalled();
    const publish = vi.fn();
    const closed = createOpeningLifecycle("closed", publish);
    closed.begin(gesture);
    closed.cancel();
    vi.runAllTimers();
    expect(publish.mock.calls).toEqual([["opening"]]);
  });
  it("owns reload/bfcache positioning only while closed and restores browser history policy", () => {
    const view = Object.assign(new EventTarget(), {
      history: { scrollRestoration: "auto" },
      scrollY: 4500,
      scrollTo: vi.fn(),
      requestAnimationFrame: vi.fn(() => 7),
      cancelAnimationFrame: vi.fn(),
    });
    const surface = {
      ownerDocument: { defaultView: view },
      getBoundingClientRect: () => ({ top: -4500 }),
    } as unknown as HTMLElement;
    const release = holdClosedEntry(surface);
    expect(view.history.scrollRestoration).toBe("manual");
    expect(view.scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 0,
      behavior: "instant",
    });
    view.dispatchEvent(new Event("pageshow"));
    expect(view.scrollTo).toHaveBeenCalledTimes(2);
    release();
    release();
    view.dispatchEvent(new Event("pageshow"));
    expect(view.scrollTo).toHaveBeenCalledTimes(2);
    expect(view.history.scrollRestoration).toBe("auto");
    expect(view.cancelAnimationFrame).toHaveBeenCalledExactlyOnceWith(7);
  });
});
