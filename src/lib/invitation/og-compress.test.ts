import { randomFillSync } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

const worker = vi.hoisted(() => ({ env: undefined as unknown }));
vi.mock("@/lib/runtime/context", () => ({ getWorkerEnv: () => worker.env }));
import { fitOgImage, OG_MAX_PNG_BYTES, satoriImage } from "./og-compress";

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

describe("fitOgImage quality ladder", () => {
  it("lowers JPEG quality until the card is within the 250 KB target when possible", async () => {
    worker.env = undefined;
    const w = 1200;
    const h = 630;
    // Smooth gradient + mild noise: >250 KB as PNG, compressible as JPEG.
    const raw = Buffer.alloc(w * h * 3);
    for (let i = 0; i < raw.length; i++)
      raw[i] = ((i / 3) % w) / 5 + ((i * 2654435761) % 23);
    const big = await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
      .png({ compressionLevel: 1 })
      .toBuffer();
    expect(big.length).toBeGreaterThan(OG_MAX_PNG_BYTES);
    const out = await fitOgImage(response(big));
    const bytes = Buffer.from(await out.arrayBuffer());
    expect(out.headers.get("content-type")).toBe("image/jpeg");
    expect(bytes.length).toBeLessThanOrEqual(OG_MAX_PNG_BYTES);
    expect((await sharp(bytes).metadata()).width).toBe(1200);
  });
});

describe("satoriImage (WebP/AVIF are invisible to Satori)", () => {
  const uri = (mime: string, bytes: Buffer) =>
    `data:${mime};base64,${bytes.toString("base64")}`;
  const solid = (format: "webp" | "png" | "jpeg") =>
    sharp({
      create: { width: 40, height: 30, channels: 3, background: "#c0392b" },
    })
      [format]()
      .toBuffer();

  it("converts WebP to JPEG on Node", async () => {
    worker.env = undefined;
    const out = await satoriImage(uri("image/webp", await solid("webp")));
    expect(out).toMatch(/^data:image\/jpeg;base64,/);
    const meta = await sharp(
      Buffer.from(out!.split(",")[1], "base64"),
    ).metadata();
    expect([meta.format, meta.width]).toEqual(["jpeg", 40]);
  });

  it("passes native formats through untouched", async () => {
    worker.env = undefined;
    const png = uri("image/png", await solid("png"));
    expect(await satoriImage(png)).toBe(png);
    const svg = "data:image/svg+xml;base64,PHN2Zy8+";
    expect(await satoriImage(svg)).toBe(svg);
    expect(await satoriImage(undefined)).toBeUndefined();
  });

  it("downscales oversized photos for render speed", async () => {
    worker.env = undefined;
    const w = 2400;
    const h = 1800;
    const raw = Buffer.alloc(w * h * 3);
    randomFillSync(raw);
    const big = await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer();
    const out = await satoriImage(uri("image/jpeg", big));
    const meta = await sharp(
      Buffer.from(out!.split(",")[1], "base64"),
    ).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1400);
  });

  it("on Workers drops WebP (no decoder) but keeps native images", async () => {
    worker.env = {};
    const webp = uri("image/webp", await solid("webp"));
    expect(await satoriImage(webp)).toBeUndefined();
    const png = uri("image/png", await solid("png"));
    expect(await satoriImage(png)).toBe(png);
    worker.env = undefined;
  });
});
