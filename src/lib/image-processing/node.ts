import sharp from "sharp";
import {
  clampCrop,
  ImageCapacityError,
  ImageValidationError,
  isAnimatedImage,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
  WEBP_QUALITY,
  type ImageProcessor,
} from "./types";

const MAX_CONCURRENT_TRANSFORMS = 2;
let activeTransforms = 0;

export const nodeImageProcessor: ImageProcessor = {
  async process(input, crop) {
    if (activeTransforms >= MAX_CONCURRENT_TRANSFORMS) {
      throw new ImageCapacityError(
        "Pemrosesan gambar sedang penuh. Coba lagi.",
      );
    }
    activeTransforms++;
    try {
      if (isAnimatedImage(input))
        throw new ImageValidationError("Gambar animasi tidak didukung.");
      const bytes = Buffer.from(input);
      const image = sharp(bytes, {
        limitInputPixels: MAX_IMAGE_PIXELS,
        failOn: "error",
      });
      const meta = await image.metadata();
      if (
        !meta.width ||
        !meta.height ||
        !["jpeg", "png", "webp", "heif"].includes(meta.format ?? "")
      ) {
        throw new ImageValidationError("Format gambar tidak didukung.");
      }
      if ((meta.pages ?? 1) > 1)
        throw new ImageValidationError("Gambar animasi tidak didukung.");
      if (meta.width * meta.height > MAX_IMAGE_PIXELS) {
        throw new ImageValidationError("Dimensi gambar terlalu besar.");
      }
      const rotated = [5, 6, 7, 8].includes(meta.orientation ?? 1);
      const width = rotated ? meta.height : meta.width;
      const height = rotated ? meta.width : meta.height;
      let pipeline = image.rotate();
      if (crop) pipeline = pipeline.extract(clampCrop(crop, width, height));
      const result = await pipeline
        .resize({
          width: MAX_IMAGE_EDGE,
          height: MAX_IMAGE_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
      return {
        bytes: result.data.buffer.slice(
          result.data.byteOffset,
          result.data.byteOffset + result.data.byteLength,
        ) as ArrayBuffer,
        width: result.info.width,
        height: result.info.height,
      };
    } catch (error) {
      if (
        error instanceof ImageCapacityError ||
        error instanceof ImageValidationError
      )
        throw error;
      throw new ImageValidationError("Gambar tidak bisa diproses.");
    } finally {
      activeTransforms--;
    }
  },
};
