import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
afterEach(() => vi.unstubAllGlobals());
const request = (id = "142986206") =>
  GET(new Request("http://localhost/api/music/deezer/" + id), {
    params: Promise.resolve({ id }),
  });
describe("fresh Deezer previews", () => {
  it("resolves a fresh preview without caching the expiring redirect", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          preview: "https://cdnt-preview.dzcdn.net/fresh.mp3?signature=new",
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await request();
    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toContain("signature=new");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.deezer.com/track/142986206",
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    );
  });
  it("rejects invalid IDs before networking", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await request("../private")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { preview: "http://cdnt-preview.dzcdn.net/test" },
    { preview: "https://evil.example/audio" },
    { preview: "https://dzcdn.net.evil.example/audio" },
  ])("rejects missing or untrusted provider URLs", async (data) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
    expect((await request()).status).toBe(502);
  });
  it("contains upstream errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect((await request()).status).toBe(502);
  });
});
