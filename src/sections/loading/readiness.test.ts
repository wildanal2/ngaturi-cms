import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOADING_DEADLINE_MS,
  LOADING_MINIMUM_MS,
  startLoading,
  waitForCriticalAssets,
} from "./readiness";

class Asset extends EventTarget {
  src = "/asset";
  complete = false;
  naturalWidth = 100;
  decode = vi.fn().mockResolvedValue(undefined);
  readyState = 0;
  error = null;
  preload = "none";
  load = vi.fn();
  play = vi.fn();
  addEventListener = vi.fn(super.addEventListener);
  removeEventListener = vi.fn(super.removeEventListener);
}
const img = (asset: Asset) => asset as unknown as HTMLImageElement;
const audio = (asset: Asset) => asset as unknown as HTMLAudioElement;
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", { fonts: { load: vi.fn().mockResolvedValue([]) } });
  vi.stubGlobal("Image", Asset);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bounded Loading readiness", () => {
  it("waits for real image decode, fonts and the existing audio without playing", async () => {
    const image = new Asset();
    const music = new Asset();
    const done = vi.fn();
    const cancel = startLoading(
      (signal) =>
        waitForCriticalAssets(
          {
            images: [img(image)],
            audio: audio(music),
            fonts: [{ family: '"Cormorant"' }],
          },
          signal,
        ),
      done,
    );
    expect(music.load).toHaveBeenCalledTimes(1);
    expect(music.preload).toBe("auto");
    image.dispatchEvent(new Event("load"));
    await vi.advanceTimersByTimeAsync(LOADING_MINIMUM_MS);
    expect(done).not.toHaveBeenCalled();
    music.dispatchEvent(new Event("canplay"));
    await flush();
    expect(image.decode).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledExactlyOnceWith("ready");
    expect(music.play).not.toHaveBeenCalled();
    expect(document.fonts.load).toHaveBeenCalledWith(
      '400 16px "Cormorant"',
      "Mempersiapkan kisah kami",
    );
    cancel();
  });
  it("keeps cached/no-music entry visible for the minimum, then completes once", async () => {
    const image = new Asset();
    image.complete = true;
    const done = vi.fn();
    startLoading(
      (signal) => waitForCriticalAssets({ images: [img(image)] }, signal),
      done,
    );
    await vi.advanceTimersByTimeAsync(LOADING_MINIMUM_MS - 1);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledExactlyOnceWith("ready");
    await vi.advanceTimersByTimeAsync(10000);
    expect(done).toHaveBeenCalledOnce();
  });
  it("releases failed images/audio/fonts, including a rejected decode", async () => {
    const image = new Asset();
    const decoded = new Asset();
    decoded.complete = true;
    decoded.decode.mockRejectedValue(new Error("decode"));
    const music = new Asset();
    vi.mocked(document.fonts.load).mockRejectedValue(new Error("font"));
    const done = vi.fn();
    startLoading(
      (signal) =>
        waitForCriticalAssets(
          {
            images: [img(image), img(decoded)],
            audio: audio(music),
            fonts: [{ family: '"Inter"' }],
          },
          signal,
        ),
      done,
    );
    image.dispatchEvent(new Event("error"));
    music.dispatchEvent(new Event("error"));
    await vi.advanceTimersByTimeAsync(LOADING_MINIMUM_MS);
    expect(done).toHaveBeenCalledExactlyOnceWith("ready");
  });
  it("times out unresolved resources and removes listeners; late assets cannot reactivate it", async () => {
    const image = new Asset();
    const music = new Asset();
    const done = vi.fn();
    startLoading(
      (signal) =>
        waitForCriticalAssets(
          { images: [img(image)], audio: audio(music) },
          signal,
        ),
      done,
    );
    await vi.advanceTimersByTimeAsync(LOADING_DEADLINE_MS);
    expect(done).toHaveBeenCalledExactlyOnceWith("timeout");
    expect(image.removeEventListener).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
    );
    expect(music.removeEventListener).toHaveBeenCalledWith(
      "canplay",
      expect.any(Function),
    );
    image.dispatchEvent(new Event("load"));
    music.dispatchEvent(new Event("canplay"));
    await flush();
    expect(done).toHaveBeenCalledOnce();
  });
  it("cancels on unmount without a callback or a second audio load on reattachment", async () => {
    const image = new Asset();
    const music = new Asset();
    const done = vi.fn();
    const prepare = (signal: AbortSignal) =>
      waitForCriticalAssets(
        { images: [img(image)], audio: audio(music) },
        signal,
      );
    const cancel = startLoading(prepare, done);
    cancel();
    const second = startLoading(prepare, done);
    expect(music.load).toHaveBeenCalledOnce();
    second();
    await vi.advanceTimersByTimeAsync(10000);
    expect(done).not.toHaveBeenCalled();
    expect(image.removeEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });
  it("counts already-visible time toward the deadline instead of restarting after hydration", async () => {
    const done = vi.fn();
    startLoading(() => new Promise(() => {}), done, 1900);
    await vi.advanceTimersByTimeAsync(599);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledExactlyOnceWith("timeout");
  });
  it("falls back if readiness detection itself throws or is unavailable", async () => {
    vi.stubGlobal("document", {});
    const done = vi.fn();
    startLoading(() => {
      throw new Error("unsupported");
    }, done);
    await vi.advanceTimersByTimeAsync(LOADING_MINIMUM_MS);
    expect(done).toHaveBeenCalledExactlyOnceWith("ready");
    await expect(
      waitForCriticalAssets({}, new AbortController().signal),
    ).resolves.toBeUndefined();
  });
});
