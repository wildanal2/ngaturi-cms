import { describe, expect, it } from "vitest";
import { musicPlaybackUrl } from "./playback-url";
describe("stable music URL", () => {
  it("repairs legacy expiring Deezer previews using track identity", () => {
    expect(
      musicPlaybackUrl(
        "https://cdnt-preview.dzcdn.net/expired.mp3",
        "deezer:142986206",
      ),
    ).toBe("/api/music/deezer/142986206");
  });
  it("preserves custom/uploaded files and other providers", () => {
    for (const id of [undefined, "itunes:12", "deezer:../host"])
      expect(musicPlaybackUrl("/own.mp3", id)).toBe("/own.mp3");
    expect(musicPlaybackUrl("", "deezer:12")).toBe("");
  });
});
