import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationLoadingBoundary } from "./boundary";

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  hydrating: false,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useSyncExternalStore: () => hooks.hydrating,
  useState: (initial: unknown) => {
    const i = hooks.cursor++;
    hooks.slots[i] ??= initial;
    return [
      hooks.slots[i],
      (value: unknown) => {
        hooks.slots[i] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const i = hooks.cursor++;
    hooks.slots[i] ??= { current: initial };
    return hooks.slots[i];
  },
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));
const prepare = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("./readiness", async (original) => ({
  ...(await original<typeof import("./readiness")>()),
  waitForCriticalAssets: prepare,
}));
afterEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  hooks.hydrating = false;
  hooks.effects = [];
  prepare.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Loading boundary lifecycle", () => {
  it("remains complete across ordinary rerenders and effect reattachment without loading again", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    InvitationLoadingBoundary({
      profile: "unknown",
      visual: null,
      children: null,
    });
    (hooks.slots[2] as { current: unknown }).current = {};
    const cleanup = hooks.effects[0]();
    await vi.advanceTimersByTimeAsync(750);
    expect(hooks.slots[0]).toBe("complete");
    expect(prepare).toHaveBeenCalledOnce();
    cleanup?.();
    hooks.cursor = 0;
    hooks.effects = [];
    InvitationLoadingBoundary({
      profile: "edited",
      visual: null,
      children: null,
    });
    expect(hooks.effects[0]()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(5000);
    expect(hooks.slots[0]).toBe("complete");
    expect(prepare).toHaveBeenCalledOnce();
  });
  it("gives a client-navigation entry a fresh budget instead of using the previous page paint", async () => {
    vi.useFakeTimers();
    const paint = vi.fn(() => [
      { name: "first-contentful-paint", startTime: 0 },
    ]);
    vi.stubGlobal("performance", {
      getEntriesByType: paint,
      now: () => 100000,
    });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    InvitationLoadingBoundary({
      profile: "unknown",
      visual: null,
      children: null,
    });
    (hooks.slots[2] as { current: unknown }).current = {};
    const cleanup = hooks.effects[0]();
    await vi.advanceTimersByTimeAsync(399);
    expect(hooks.slots[0]).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(hooks.slots[0]).toBe("complete");
    expect(paint).not.toHaveBeenCalled();
    cleanup?.();
  });
  it("does not leave a dissolve callback running after unmount", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    InvitationLoadingBoundary({
      profile: "unknown",
      visual: null,
      children: null,
    });
    (hooks.slots[2] as { current: unknown }).current = {};
    const cleanup = hooks.effects[0]();
    await vi.advanceTimersByTimeAsync(400);
    expect(hooks.slots[0]).toBe("leaving");
    cleanup?.();
    await vi.advanceTimersByTimeAsync(1000);
    expect(hooks.slots[0]).toBe("leaving");
  });
  it("restores the existing page scroll restriction on unmount", () => {
    const screen = Object.assign(new EventTarget(), { focus: vi.fn() });
    const page = { style: { overflow: "clip" } };
    vi.stubGlobal("document", { documentElement: page });
    InvitationLoadingBoundary({
      profile: "unknown",
      visual: null,
      children: null,
    });
    (hooks.slots[3] as { current: unknown }).current = {
      querySelector: () => screen,
    };
    const cleanup = hooks.effects[1]();
    expect(page.style.overflow).toBe("hidden");
    expect(screen.focus).toHaveBeenCalledWith({ preventScroll: true });
    cleanup?.();
    expect(page.style.overflow).toBe("clip");
  });
});
