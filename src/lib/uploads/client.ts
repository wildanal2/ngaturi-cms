/**
 * Read a POST /api/uploads response in the browser. The server answers JSON,
 * but proxies/runtimes can still return HTML or an empty body on 5xx/413, so
 * never let `res.json()` decide the error message.
 */
export async function readUploadResponse(
  res: Response,
): Promise<{ publicUrl: string }> {
  const text = await res.text().catch(() => "");
  let data: { publicUrl?: unknown; error?: unknown } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok || typeof data?.publicUrl !== "string") {
    const message =
      typeof data?.error === "string" && data.error
        ? data.error
        : res.status === 413
          ? "Ukuran file terlalu besar."
          : `Upload gagal (HTTP ${res.status}). Coba lagi.`;
    throw new Error(message);
  }
  return { publicUrl: data.publicUrl };
}

/** Mirrors MAX_AUDIO_BYTES / the 10 MB image cap enforced by POST /api/uploads. */
export const CLIENT_MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const CLIENT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * The server answers an oversized upload with 413 before reading the body, and
 * on DEV that early reply never reached Chromium through the tunnel: the
 * Builder spinner ran forever. Refuse files the server is sure to reject.
 */
export function uploadSizeError(
  file: Pick<File, "size">,
  kind: "audio" | "image",
): string | null {
  const max =
    kind === "audio" ? CLIENT_MAX_AUDIO_BYTES : CLIENT_MAX_IMAGE_BYTES;
  if (file.size <= max) return null;
  return `File terlalu besar (maks ${max / 1024 / 1024} MB). Kompres atau pilih file lain.`;
}
