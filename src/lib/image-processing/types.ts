export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedImage {
  bytes: ArrayBuffer;
  width: number;
  height: number;
}

export interface ImageProcessor {
  process(input: ArrayBuffer, crop: Crop | null): Promise<ProcessedImage>;
}

export class ImageValidationError extends Error {}
export class ImageCapacityError extends Error {}

export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_EDGE = 1920;
export const WEBP_QUALITY = 82;

export function clampCrop(crop: Crop, width: number, height: number) {
  const left = Math.floor(Math.max(0, Math.min(crop.x, width - 1)));
  const top = Math.floor(Math.max(0, Math.min(crop.y, height - 1)));
  return {
    left,
    top,
    width: Math.floor(Math.max(1, Math.min(crop.width, width - left))),
    height: Math.floor(Math.max(1, Math.min(crop.height, height - top))),
  };
}

/** GIF is intentionally unsupported; WebP and PNG animation chunks are rejected. */
export function isAnimatedImage(bytes: ArrayBuffer): boolean {
  const data = new Uint8Array(bytes);
  const ascii = (start: number, value: string) =>
    value.split("").every((char, i) => data[start + i] === char.charCodeAt(0));
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return true;
  if (ascii(4, "ftyp")) {
    for (let i = 8; i + 4 <= Math.min(data.length, 64); i += 4) {
      if (ascii(i, "avis")) return true;
    }
  }
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) {
    for (let i = 12; i + 8 <= data.length;) {
      const size =
        (data[i + 4] |
          (data[i + 5] << 8) |
          (data[i + 6] << 16) |
          (data[i + 7] << 24)) >>>
        0;
      if (ascii(i, "ANIM") || ascii(i, "ANMF")) return true;
      i += 8 + size + (size % 2);
    }
  }
  if (data.length >= 8 && ascii(1, "PNG")) {
    for (let i = 8; i + 12 <= data.length;) {
      const size =
        ((data[i] << 24) |
          (data[i + 1] << 16) |
          (data[i + 2] << 8) |
          data[i + 3]) >>>
        0;
      if (ascii(i + 4, "acTL")) return true;
      i += 12 + size;
    }
  }
  return false;
}
