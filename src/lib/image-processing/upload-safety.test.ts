import { afterEach, describe, expect, it, vi } from "vitest";
import {
  boundedFormData,
  detectAudio,
  fetchTrustedImageSource,
  tryAcquireNodeUploadSlot,
  UploadTooLargeError,
} from "./upload-safety";

afterEach(() => vi.unstubAllGlobals());

describe("bounded upload input", () => {
  it("checks audio signatures instead of trusting declared MIME", () => {
    expect(
      detectAudio(new TextEncoder().encode("ID3\u0004\u0000").buffer),
    ).toEqual({ mime: "audio/mpeg", ext: "mp3" });
    expect(
      detectAudio(new TextEncoder().encode("xxxxftypavif").buffer),
    ).toBeNull();
  });
  it("caps simultaneous Node uploads without a waiting queue", () => {
    const releaseOne = tryAcquireNodeUploadSlot();
    const releaseTwo = tryAcquireNodeUploadSlot();
    expect(releaseOne).not.toBeNull();
    expect(releaseTwo).not.toBeNull();
    expect(tryAcquireNodeUploadSlot()).toBeNull();
    releaseOne?.();
    const releaseThree = tryAcquireNodeUploadSlot();
    expect(releaseThree).not.toBeNull();
    releaseTwo?.();
    releaseThree?.();
  });
  it("rejects oversized declared multipart before reading the body", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=x",
        "content-length": String(16 * 1024 * 1024),
      },
      body: "unused",
    });
    await expect(boundedFormData(req)).rejects.toBeInstanceOf(
      UploadTooLargeError,
    );
    expect(req.bodyUsed).toBe(false);
  });

  it("rejects oversized streamed multipart without consuming the remainder", async () => {
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++;
        controller.enqueue(new Uint8Array(1024 * 1024));
        if (pulls > 20) controller.close();
      },
    });
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body,
      duplex: "half",
    } as RequestInit);
    await expect(boundedFormData(req)).rejects.toBeInstanceOf(
      UploadTooLargeError,
    );
    expect(pulls).toBeLessThan(22);
  });

  it("rejects redirect and oversized recrop responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 302,
            headers: { location: "https://other.example/x" },
          }),
        )
        .mockResolvedValueOnce(
          new Response("x", {
            headers: { "content-length": String(11 * 1024 * 1024) },
          }),
        ),
    );
    await expect(
      fetchTrustedImageSource("https://trusted.example/a", 10 * 1024 * 1024),
    ).rejects.toThrow();
    await expect(
      fetchTrustedImageSource("https://trusted.example/a", 10 * 1024 * 1024),
    ).rejects.toBeInstanceOf(UploadTooLargeError);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      redirect: "manual",
    });
  });

  it("stops a recrop response that streams past the byte cap", async () => {
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1024));
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    await expect(
      fetchTrustedImageSource("https://trusted.example/a", 2048),
    ).rejects.toBeInstanceOf(UploadTooLargeError);
  });
});
