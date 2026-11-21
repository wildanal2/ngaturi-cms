import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES } from "@/lib/image-processing/upload-safety";
import {
  CLIENT_MAX_AUDIO_BYTES,
  readUploadResponse,
  uploadSizeError,
} from "./client";

describe("readUploadResponse", () => {
  it("returns the uploaded public URL", async () => {
    await expect(
      readUploadResponse(Response.json({ publicUrl: "https://cdn/x.mp3" })),
    ).resolves.toEqual({ publicUrl: "https://cdn/x.mp3" });
  });

  it("surfaces the server's JSON error", async () => {
    await expect(
      readUploadResponse(
        Response.json({ error: "File harus audio." }, { status: 415 }),
      ),
    ).rejects.toThrow("File harus audio.");
  });

  // Regression (#18 QA): an HTML 500 page made res.json() throw a SyntaxError
  // ("Unexpected token '<'") that was shown to the user.
  it("turns an HTML or empty 5xx into a readable error", async () => {
    await expect(
      readUploadResponse(
        new Response("<!DOCTYPE html><html>Internal Server Error</html>", {
          status: 500,
          headers: { "content-type": "text/html" },
        }),
      ),
    ).rejects.toThrow("Upload gagal (HTTP 500). Coba lagi.");
    await expect(
      readUploadResponse(new Response(null, { status: 502 })),
    ).rejects.toThrow("Upload gagal (HTTP 502). Coba lagi.");
  });

  it("explains a proxy 413 without JSON", async () => {
    await expect(
      readUploadResponse(
        new Response("Request Entity Too Large", { status: 413 }),
      ),
    ).rejects.toThrow("Ukuran file terlalu besar.");
  });

  it("rejects a 200 without a public URL", async () => {
    await expect(readUploadResponse(Response.json({}))).rejects.toThrow(
      "Upload gagal (HTTP 200). Coba lagi.",
    );
  });
});

describe("uploadSizeError", () => {
  it("keeps the client audio limit equal to the server limit", () => {
    expect(CLIENT_MAX_AUDIO_BYTES).toBe(MAX_AUDIO_BYTES);
  });

  // Regression (#18 DEV QA): a 16 MB MP3 left the Builder spinner running
  // forever because the server's early 413 never reached the browser.
  it("rejects files the server would refuse, before any request", () => {
    expect(uploadSizeError({ size: MAX_AUDIO_BYTES }, "audio")).toBeNull();
    expect(uploadSizeError({ size: MAX_AUDIO_BYTES + 1 }, "audio")).toMatch(
      /maks 15 MB/,
    );
    expect(uploadSizeError({ size: 10 * 1024 * 1024 }, "image")).toBeNull();
    expect(uploadSizeError({ size: 10 * 1024 * 1024 + 1 }, "image")).toMatch(
      /maks 10 MB/,
    );
  });
});
