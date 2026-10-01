export class UploadTooLargeError extends Error {}
export class UploadValidationError extends Error {}

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
let activeNodeUploads = 0;

/** Cap request buffering as well as transforms on small Node instances. */
export function tryAcquireNodeUploadSlot(): (() => void) | null {
  if (activeNodeUploads >= 2) return null;
  activeNodeUploads++;
  return () => {
    activeNodeUploads--;
  };
}

/** Reject on Content-Length when available, and stop reading at the bounded cap otherwise. */
export async function boundedFormData(req: Request): Promise<FormData> {
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("multipart/form-data;")
  ) {
    throw new UploadValidationError("Form upload tidak valid.");
  }
  const maxBytes = MAX_AUDIO_BYTES + MULTIPART_OVERHEAD_BYTES;
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new UploadTooLargeError();
  if (!req.body) throw new UploadValidationError("Form upload tidak valid.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new UploadTooLargeError();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
    if (total > maxBytes) await req.body.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Response(bytes, {
      headers: { "content-type": req.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new UploadValidationError("Form upload tidak valid.");
  }
}

/** Keep accepted audio types small and tie the stored MIME/extension to bytes. */
export function detectAudio(
  bytes: ArrayBuffer,
): { mime: string; ext: string } | null {
  const data = new Uint8Array(bytes);
  const ascii = (offset: number, text: string) =>
    text.split("").every((char, i) => data[offset + i] === char.charCodeAt(0));
  if (ascii(0, "ID3") || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0)) {
    return { mime: "audio/mpeg", ext: "mp3" };
  }
  if (ascii(0, "OggS")) return { mime: "audio/ogg", ext: "ogg" };
  if (ascii(0, "RIFF") && ascii(8, "WAVE"))
    return { mime: "audio/wav", ext: "wav" };
  if (ascii(0, "fLaC")) return { mime: "audio/flac", ext: "flac" };
  if (
    ascii(4, "ftyp") &&
    ["M4A ", "M4B ", "isom", "mp41", "mp42"].some((brand) => ascii(8, brand))
  )
    return { mime: "audio/mp4", ext: "m4a" };
  if (
    data[0] === 0x1a &&
    data[1] === 0x45 &&
    data[2] === 0xdf &&
    data[3] === 0xa3
  ) {
    return { mime: "audio/webm", ext: "webm" };
  }
  if (data[0] === 0xff && (data[1] & 0xf6) === 0xf0) {
    return { mime: "audio/aac", ext: "aac" };
  }
  return null;
}

export function audioMimeMatches(declared: string, detected: string): boolean {
  const aliases: Record<string, string[]> = {
    "audio/mpeg": ["audio/mpeg", "audio/mp3", "audio/x-mpeg"],
    "audio/wav": ["audio/wav", "audio/x-wav", "audio/wave"],
    "audio/flac": ["audio/flac", "audio/x-flac"],
    "audio/mp4": ["audio/mp4", "audio/x-m4a"],
  };
  return (aliases[detected] ?? [detected]).includes(declared);
}

export async function fetchTrustedImageSource(
  url: string,
  maxBytes: number,
): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: { accept: "image/*" },
  });
  if (!response.ok || response.status >= 300)
    throw new UploadValidationError("Sumber gambar tidak valid.");
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new UploadTooLargeError();
  }
  if (!response.body)
    throw new UploadValidationError("Sumber gambar tidak valid.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new UploadTooLargeError();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
    if (total > maxBytes) await response.body.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
