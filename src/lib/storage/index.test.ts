import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithInvocationContext } from "@/lib/runtime/context";
import { env } from "@/lib/env";
import {
  isTrustedPublicUrl,
  legacyPublicUrl,
  publicUrl,
  putObject,
} from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public media origins", () => {
  it("targets R2 using the existing signed Node transport and configured public domain", async () => {
    const original = {
      AWS_ENDPOINT_URL_S3: env.AWS_ENDPOINT_URL_S3,
      S3_BUCKET: env.S3_BUCKET,
      S3_PUBLIC_URL: env.S3_PUBLIC_URL,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(env, {
      AWS_ENDPOINT_URL_S3: "https://example.r2.cloudflarestorage.com",
      S3_BUCKET: "dev-fixture",
      S3_PUBLIC_URL: "https://media.example.com",
    });
    try {
      const key = "invitations/test/audio/fixture.wav";
      await putObject({
        key,
        body: new Uint8Array([1, 2]),
        contentType: "audio/wav",
      });
      const request = fetchMock.mock.calls[0][0] as Request;
      expect(request.url).toBe(
        `https://example.r2.cloudflarestorage.com/dev-fixture/${key}`,
      );
      expect(request.headers.get("authorization")).toMatch(
        /^AWS4-HMAC-SHA256 /,
      );
      expect(publicUrl(key)).toBe(`https://media.example.com/${key}`);
      expect(
        isTrustedPublicUrl("https://legacy.example.com/media/old.webp"),
      ).toBe(true);
    } finally {
      Object.assign(env, original);
    }
  });

  it("accepts the legacy and R2 custom-domain origins", () => {
    expect(
      isTrustedPublicUrl("https://legacy.example.com/media/photo.webp"),
    ).toBe(true);
    expect(
      isTrustedPublicUrl("https://legacy.example.com/media-other/photo.webp"),
    ).toBe(false);
    expect(
      isTrustedPublicUrl(
        "https://legacy.example.com.evil.test/media/photo.webp",
      ),
    ).toBe(false);
    expect(isTrustedPublicUrl("https://cdn.example.com/photo.webp")).toBe(true);
    expect(isTrustedPublicUrl("https://media.example.com/photo.webp")).toBe(
      true,
    );
    expect(
      isTrustedPublicUrl("https://cdn.example.com.evil.test/photo.webp"),
    ).toBe(false);
    expect(
      isTrustedPublicUrl("https://evil.test/https://cdn.example.com/x"),
    ).toBe(false);
  });

  it("uses the configured S3 public origin for Node and presigned writes", () => {
    expect(publicUrl("invitations/test/audio.mp3")).toBe(
      "https://cdn.example.com/invitations/test/audio.mp3",
    );
    expect(legacyPublicUrl("invitations/test/photo.webp")).toBe(
      "https://cdn.example.com/invitations/test/photo.webp",
    );
  });

  it("uses only the R2 custom domain for Worker-generated URLs", () => {
    expect(
      runWithInvocationContext(
        { R2_PUBLIC_URL: "https://media.example.com" },
        () => publicUrl("invitations/test/photo.webp"),
      ),
    ).toBe("https://media.example.com/invitations/test/photo.webp");
  });

  it("fails clearly without a Worker R2 public origin", () => {
    expect(() =>
      runWithInvocationContext({}, () => publicUrl("x.webp")),
    ).toThrow("R2_PUBLIC_URL is required in the Cloudflare Worker runtime");
  });

  it("rejects r2.dev for Worker-generated public URLs", () => {
    expect(() =>
      runWithInvocationContext(
        { R2_PUBLIC_URL: "https://example.r2.dev" },
        () => publicUrl("x.webp"),
      ),
    ).toThrow("R2_PUBLIC_URL must use an HTTPS R2 custom domain");
  });

  it("never falls back to signed S3 writes inside a Worker invocation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runWithInvocationContext({}, () =>
        putObject({
          key: "invitations/test/photo.webp",
          body: new Uint8Array([1]),
          contentType: "image/webp",
        }),
      ),
    ).rejects.toThrow(
      "MEDIA_BUCKET binding is required in the Cloudflare Worker runtime",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("writes through MEDIA_BUCKET in the Worker runtime", async () => {
    const put = vi.fn().mockResolvedValue(undefined);

    await runWithInvocationContext(
      { MEDIA_BUCKET: { put, get: vi.fn() } },
      () =>
        putObject({
          key: "invitations/test/photo.webp",
          body: new Uint8Array([1]),
          contentType: "image/webp",
          cacheControl: "public, max-age=60",
        }),
    );

    expect(put).toHaveBeenCalledWith(
      "invitations/test/photo.webp",
      expect.any(Uint8Array),
      {
        httpMetadata: {
          contentType: "image/webp",
          cacheControl: "public, max-age=60",
        },
      },
    );
  });

  it("keeps Node object writes on the signed S3-compatible path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await putObject({
      key: "invitations/test/audio.mp3",
      body: new Uint8Array([1, 2]),
      contentType: "audio/mpeg",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(
      "https://s3.example.com/test/invitations/test/audio.mp3",
    );
    expect(request.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 /);
  });
});
