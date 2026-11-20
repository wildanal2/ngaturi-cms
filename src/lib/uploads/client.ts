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
