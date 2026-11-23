import { getWorkerEnv } from "@/lib/runtime/context";

/**
 * WhatsApp drops link-preview thumbnails whose image is larger than roughly
 * 300 KB. Photo-heavy cards render to ~500 KB PNG, so large cards are re-encoded
 * as JPEG (same pixels, ~10x smaller). Small cards and any failure keep the
 * original PNG, so the preview card never gets worse.
 */
export const OG_MAX_PNG_BYTES = 250 * 1024;

const SATORI_NATIVE = /^data:image\/(?:png|jpeg|gif|svg\+xml);base64,/;
const LARGE_DATA_URI = 900 * 1024;

/**
 * Satori only decodes PNG/JPEG/GIF/SVG; WebP/AVIF (common for uploads) would
 * render as an empty box. On Node they are converted to a bounded JPEG, and
 * oversized photos are downscaled for render speed. Workers have no sharp, so
 * unsupported formats return undefined and the card falls back to typography.
 */
export async function satoriImage(
  dataUri: string | undefined,
): Promise<string | undefined> {
  if (!dataUri) return undefined;
  const native = SATORI_NATIVE.test(dataUri);
  if (
    native &&
    (dataUri.length < LARGE_DATA_URI ||
      getWorkerEnv() ||
      dataUri.startsWith("data:image/svg"))
  )
    return dataUri;
  if (getWorkerEnv()) return native ? dataUri : undefined;
  try {
    const sharp = (await import("sharp")).default;
    const input = Buffer.from(
      dataUri.slice(dataUri.indexOf(",") + 1),
      "base64",
    );
    const out = await sharp(input)
      .resize({
        width: 1400,
        height: 1400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return native ? dataUri : undefined;
  }
}

export async function fitOgImage(res: Response): Promise<Response> {
  const png = await res.arrayBuffer();
  const original = () => new Response(png, { headers: res.headers });
  if (png.byteLength <= OG_MAX_PNG_BYTES || getWorkerEnv()) return original();
  try {
    const sharp = (await import("sharp")).default;
    // Lower quality only while the card is still over the ceiling.
    let jpeg = Buffer.alloc(0);
    for (const quality of [80, 66, 52]) {
      jpeg = await sharp(Buffer.from(png))
        .flatten({ background: "#ffffff" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (jpeg.byteLength <= OG_MAX_PNG_BYTES) break;
    }
    if (jpeg.byteLength >= png.byteLength) return original();
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "image/jpeg");
    headers.delete("Content-Length");
    return new Response(new Uint8Array(jpeg), { headers });
  } catch {
    return original();
  }
}
