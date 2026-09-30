import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { nodeImageProcessor } from "./node";
import {
  ImageCapacityError,
  ImageValidationError,
  isAnimatedImage,
} from "./types";

function arrayBuffer(bytes: Buffer): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

describe("Node Sharp image processor", () => {
  it("detects animated AVIF brands", () => {
    expect(
      isAnimatedImage(new TextEncoder().encode("xxxxftypavifxxxxavis").buffer),
    ).toBe(true);
  });
  it.each(["jpeg", "png", "webp", "avif"] as const)(
    "decodes %s and emits metadata-free WebP",
    async (format) => {
      const source = sharp({
        create: { width: 800, height: 600, channels: 3, background: "red" },
      });
      const input = arrayBuffer(await source.toFormat(format).toBuffer());
      const result = await nodeImageProcessor.process(input, null);
      const meta = await sharp(result.bytes).metadata();
      expect(meta.format).toBe("webp");
      expect([result.width, result.height]).toEqual([800, 600]);
      expect(meta.exif).toBeUndefined();
    },
  );

  it("orients before crop, clamps crop, and returns output dimensions", async () => {
    const input = arrayBuffer(
      await sharp({
        create: { width: 300, height: 200, channels: 3, background: "blue" },
      })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer(),
    );
    const oriented = await nodeImageProcessor.process(input, null);
    expect([oriented.width, oriented.height]).toEqual([200, 300]);
    const cropped = await nodeImageProcessor.process(input, {
      x: 180,
      y: 280,
      width: 200,
      height: 100,
    });
    expect([cropped.width, cropped.height]).toEqual([20, 20]);
  });

  it("resizes large images without enlargement", async () => {
    const input = arrayBuffer(
      await sharp({
        create: { width: 2400, height: 1200, channels: 3, background: "green" },
      })
        .png()
        .toBuffer(),
    );
    const result = await nodeImageProcessor.process(input, null);
    expect([result.width, result.height]).toEqual([1920, 960]);
  });

  it("rejects corrupt, excessive-pixel and animated inputs", async () => {
    await expect(
      nodeImageProcessor.process(new TextEncoder().encode("bad").buffer, null),
    ).rejects.toBeInstanceOf(ImageValidationError);
    const tooLarge = arrayBuffer(
      await sharp({
        create: { width: 5000, height: 5000, channels: 3, background: "red" },
      })
        .jpeg()
        .toBuffer(),
    );
    await expect(
      nodeImageProcessor.process(tooLarge, null),
    ).rejects.toBeInstanceOf(ImageValidationError);
    const gif = new TextEncoder().encode("GIF89a").buffer;
    await expect(nodeImageProcessor.process(gif, null)).rejects.toThrow(
      "Gambar animasi tidak didukung.",
    );
  });

  it("fails the third concurrent transform without queuing", async () => {
    const input = arrayBuffer(
      await sharp({
        create: {
          width: 3500,
          height: 3500,
          channels: 3,
          background: "orange",
        },
      })
        .png()
        .toBuffer(),
    );
    const first = nodeImageProcessor.process(input, null);
    const second = nodeImageProcessor.process(input, null);
    await expect(
      nodeImageProcessor.process(input, null),
    ).rejects.toBeInstanceOf(ImageCapacityError);
    await Promise.all([first, second]);
  });
});
