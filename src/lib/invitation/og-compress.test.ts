import { randomFillSync } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

const worker = vi.hoisted(() => ({ env: undefined as unknown }));
vi.mock("@/lib/runtime/context", () => ({ getWorkerEnv: () => worker.env }));
import { fitOgImage, OG_MAX_PNG_BYTES } from "./og-compress";

async function png(noisy: boolean) {
  const w = 1200;
  const h = 630;
  const raw = Buffer.alloc(w * h * 3);
  if (noisy) randomFillSync(raw);
  else raw.fill(200);
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .png({ compressionLevel: 1 })
    .toBuffer();
}
const response = (bytes: Uint8Array) =>
  new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });

describe("fitOgImage (WhatsApp ~300 KB thumbnail ceiling)", () => {
  it("re-encodes oversized cards as JPEG and keeps cache headers", async () => {
    worker.env = undefined;
    const big = await png(true);
    expect(big.length).toBeGreaterThan(OG_MAX_PNG_BYTES);
    const out = await fitOgImage(response(big));
    const bytes = Buffer.from(await out.arrayBuffer());
    expect(out.headers.get("content-type")).toBe("image/jpeg");
    expect(out.headers.get("cache-control")).toBe("public, max-age=300");
    expect(bytes.length).toBeLessThan(big.length);
    const meta = await sharp(bytes).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1200, 630]);
  });

  it("leaves small cards untouched as PNG", async () => {
    worker.env = undefined;
    const small = await png(false);
    expect(small.length).toBeLessThanOrEqual(OG_MAX_PNG_BYTES);
    const out = await fitOgImage(response(small));
    expect(out.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await out.arrayBuffer()).equals(small)).toBe(true);
  });

  it("falls back to the original bytes when encoding fails or on Workers", async () => {
    worker.env = undefined;
    const junk = new Uint8Array(OG_MAX_PNG_BYTES + 10).fill(7);
    const out = await fitOgImage(response(junk));
    expect(out.headers.get("content-type")).toBe("image/png");
    expect((await out.arrayBuffer()).byteLength).toBe(junk.length);
    worker.env = {};
    const big = await png(true);
    const w = await fitOgImage(response(big));
    expect(w.headers.get("content-type")).toBe("image/png");
  });
});
