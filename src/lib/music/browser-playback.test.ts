import { afterEach, describe, expect, it, vi } from "vitest";
import { playableInBrowser, probePlayable } from "./browser-playback";

describe("playableInBrowser", () => {
  // Regression (#18 QA): Chromium builds without proprietary codecs cannot
  // decode iTunes AAC previews, yet the picker offered them.
  it("drops tracks whose format the browser cannot decode", () => {
    const noAac = (type: string) =>
      type.startsWith("audio/mpeg") ? "probably" : "";
    const tracks = [
      { id: "deezer:1", format: "audio/mpeg" },
      { id: "itunes:2", format: 'audio/mp4; codecs="mp4a.40.2"' },
      { id: "catalog-3", format: null },
      { id: "catalog-4" },
    ];
    expect(playableInBrowser(tracks, noAac).map((t) => t.id)).toEqual([
      "deezer:1",
      "catalog-3",
      "catalog-4",
    ]);
    expect(playableInBrowser(tracks, () => "maybe")).toHaveLength(4);
  });
});

class FakeAudio extends EventTarget {
  preload = "";
  src = "";
  removeAttribute = vi.fn();
  load = vi.fn();
}

afterEach(() => vi.useRealTimers());

describe("probePlayable", () => {
  it("resolves when metadata loads and releases the element", async () => {
    const audio = new FakeAudio();
    const probe = probePlayable("/api/music/deezer/1", { create: () => audio });
    expect(audio.src).toBe("/api/music/deezer/1");
    expect(audio.preload).toBe("metadata");
    audio.dispatchEvent(new Event("loadedmetadata"));
    await expect(probe).resolves.toBeUndefined();
    expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(audio.load).toHaveBeenCalled();
  });

  // Regression (#18 QA): a dead source (Audius 404, Deezer 502) used to be
  // saved and replaced the previous working selection.
  it("rejects on a media error", async () => {
    const audio = new FakeAudio();
    const probe = probePlayable("https://x/404", { create: () => audio });
    audio.dispatchEvent(new Event("error"));
    await expect(probe).rejects.toThrow("media error");
  });

  it("rejects when the source never answers", async () => {
    vi.useFakeTimers();
    const audio = new FakeAudio();
    const probe = probePlayable("https://x/slow", {
      create: () => audio,
      timeoutMs: 50,
    });
    vi.advanceTimersByTime(50);
    await expect(probe).rejects.toThrow("timeout");
    expect(audio.load).toHaveBeenCalled();
  });
});
