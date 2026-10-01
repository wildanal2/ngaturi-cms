import type { ImagesBinding } from "@/lib/runtime/context";
import {
  clampCrop,
  ImageValidationError,
  isAnimatedImage,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
  WEBP_QUALITY,
  type ImageProcessor,
} from "./types";

function stream(bytes: ArrayBuffer): ReadableStream<Uint8Array> {
  return new Response(bytes).body!;
}

export function workerImageProcessor(images: ImagesBinding): ImageProcessor {
  return {
    async process(input, crop) {
      if (isAnimatedImage(input))
        throw new ImageValidationError("Gambar animasi tidak didukung.");
      const original = await images.info(stream(input));
      const width = original.width ?? 0;
      const height = original.height ?? 0;
      if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
        throw new ImageValidationError(
          "Dimensi gambar tidak valid atau terlalu besar.",
        );
      }
      let pipeline = images.input(stream(input));
      if (crop)
        pipeline = pipeline.transform({ trim: clampCrop(crop, width, height) });
      const result = await pipeline
        .transform({
          width: MAX_IMAGE_EDGE,
          height: MAX_IMAGE_EDGE,
          fit: "scale-down",
        })
        .output({ format: "image/webp", quality: WEBP_QUALITY });
      const bytes = await result.response().arrayBuffer();
      const processed = await images.info(stream(bytes));
      if (!processed.width || !processed.height)
        throw new ImageValidationError("Gambar tidak valid.");
      return { bytes, width: processed.width, height: processed.height };
    },
  };
}
