import { getWorkerEnv } from "@/lib/runtime/context";

/**
 * WhatsApp drops link-preview thumbnails whose image is larger than roughly
 * 300 KB. Photo-heavy cards render to ~500 KB PNG, so large cards are re-encoded
 * as JPEG (same pixels, ~10x smaller). Small cards and any failure keep the
 * original PNG, so the preview card never gets worse.
 */
export const OG_MAX_PNG_BYTES = 250 * 1024;

export async function fitOgImage(res: Response): Promise<Response> {
  const png = await res.arrayBuffer();
  const original = () => new Response(png, { headers: res.headers });
  if (png.byteLength <= OG_MAX_PNG_BYTES || getWorkerEnv()) return original();
  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(Buffer.from(png))
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    if (jpeg.byteLength >= png.byteLength) return original();
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "image/jpeg");
    headers.delete("Content-Length");
    return new Response(new Uint8Array(jpeg), { headers });
  } catch {
    return original();
  }
}
