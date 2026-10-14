import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlayer } from "./shared";

const hooks = vi.hoisted(() => ({
  audio: null as unknown,
  effects: [] as (() => void | (() => void))[],
  setPlaying: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: () => ({ current: hooks.audio }),
  useState: () => [false, hooks.setPlaying],
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));
class Audio extends EventTarget {
  volume = 1;
  currentTime = 0;
  duration = 120;
  paused = true;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
}
afterEach(() => {
  hooks.effects = [];
  hooks.setPlaying.mockClear();
  vi.unstubAllGlobals();
});
describe("shared music Opening gesture", () => {
  it("never plays on mount/readiness and invokes play synchronously on Opening; cleanup detaches it", async () => {
    const owner = new EventTarget();
    vi.stubGlobal("window", owner);
    const audio = new Audio();
    hooks.audio = audio;
    usePlayer(true, true, 15);
    const cleanup = hooks.effects[0]();
    expect(audio.play).not.toHaveBeenCalled();
    audio.dispatchEvent(new Event("canplay"));
    expect(audio.play).not.toHaveBeenCalled();
    owner.dispatchEvent(new Event("ngaturi:open"));
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(15);
    await Promise.resolve();
    expect(hooks.setPlaying).toHaveBeenCalledWith(true);
    cleanup?.();
    owner.dispatchEvent(new Event("ngaturi:open"));
    expect(audio.play).toHaveBeenCalledOnce();
  });
  it("preserves preview/disabled autoplay and gracefully handles a rejected play", async () => {
    const owner = new EventTarget();
    vi.stubGlobal("window", owner);
    const audio = new Audio();
    hooks.audio = audio;
    usePlayer(true, false);
    const cleanup = hooks.effects[0]();
    owner.dispatchEvent(new Event("ngaturi:open"));
    expect(audio.play).not.toHaveBeenCalled();
    cleanup?.();
    hooks.effects = [];
    audio.play.mockRejectedValue(new Error("blocked"));
    usePlayer(true, true);
    const release = hooks.effects[0]();
    owner.dispatchEvent(new Event("ngaturi:open"));
    await Promise.resolve();
    await Promise.resolve();
    expect(hooks.setPlaying).toHaveBeenCalledWith(false);
    release?.();
  });
});
