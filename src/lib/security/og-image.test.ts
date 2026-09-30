import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOgImageData } from "./og-image";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
afterEach(() => vi.unstubAllGlobals());

describe("OG image fetch", () => {
  const app = "https://dev.ngaturi.com";
  const media = [
    "https://media-dev.ngaturi.com",
    "https://legacy.example.com/bucket",
  ];

  it("fetches approved local static and media images without redirect following", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(PNG, { headers: { "content-type": "image/png" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchOgImageData("/themes/test.png", app, media),
    ).resolves.toMatch(/^data:image\/png;base64,/);
    await expect(
      fetchOgImageData(
        "https://media-dev.ngaturi.com/invitations/x.png",
        app,
        media,
      ),
    ).resolves.toMatch(/^data:image\/png;base64,/);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://dev.ngaturi.com/themes/test.png",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it("rejects arbitrary, private, internal-route and scheme-relative targets before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const value of [
      "//evil.example/x",
      "http://169.254.169.254/latest/meta-data",
      "http://localhost/x",
      "https://evil.example/x",
      "/api/auth/get-session",
      "file:///etc/passwd",
    ]) {
      await expect(
        fetchOgImageData(value, app, media),
      ).resolves.toBeUndefined();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects redirect escape and mislabeled HTML without a second fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/x" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("<html>bad</html>", {
          headers: { "content-type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchOgImageData("/themes/a.png", app, media),
    ).resolves.toBeUndefined();
    await expect(
      fetchOgImageData("/themes/a.png", app, media),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("accepts legacy raster bytes with generic object content type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(PNG, {
          headers: { "content-type": "application/octet-stream" },
        }),
      ),
    );
    await expect(
      fetchOgImageData("https://legacy.example.com/bucket/old.png", app, media),
    ).resolves.toMatch(/^data:image\/png;base64,/);
  });
});
