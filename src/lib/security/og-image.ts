import { cardImageUrl } from "@/lib/invitation/card-visual";

const MAX_OG_IMAGE_BYTES = 5 * 1024 * 1024;
const LOCAL_IMAGE_PATH = /^\/(?:themes|uploads|images|assets|logo)\//;

function isPrivateMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("[") ||
    /^[\d.]+$/.test(host)
  );
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function detectedImageType(bytes: Uint8Array): string | null {
  const ascii = (offset: number, text: string) =>
    text
      .split("")
      .every((char, index) => bytes[offset + index] === char.charCodeAt(0));
  if (bytes[0] === 0x89 && ascii(1, "PNG")) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis")))
    return "image/avif";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "image/gif";
  return null;
}

/** Resolve and fetch once, so ImageResponse only sees inert image data. */
export async function fetchOgImageData(
  value: string | undefined,
  canonicalOrigin: string,
  trustedMediaPrefixes: readonly string[] = [],
): Promise<string | undefined> {
  const resolved = cardImageUrl(value, canonicalOrigin, trustedMediaPrefixes);
  if (!resolved) return undefined;
  const url = new URL(resolved);
  const local = url.origin === canonicalOrigin;
  if (local && !LOCAL_IMAGE_PATH.test(url.pathname)) return undefined;
  if (!local && isPrivateMediaHost(url.hostname)) return undefined;

  try {
    const response = await fetch(resolved, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { accept: "image/*" },
    });
    if (
      !response.ok ||
      response.status >= 300 ||
      !response.body ||
      (response.url && new URL(response.url).href !== url.href)
    )
      return undefined;
    const declaredMime = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_OG_IMAGE_BYTES) {
      await response.body.cancel();
      return undefined;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        total += chunk.byteLength;
        if (total > MAX_OG_IMAGE_BYTES) return undefined;
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
      if (total > MAX_OG_IMAGE_BYTES)
        await response.body.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const svg =
      local &&
      declaredMime === "image/svg+xml" &&
      /^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(
        new TextDecoder().decode(bytes.subarray(0, 512)).trimStart(),
      );
    const mime = detectedImageType(bytes) ?? (svg ? "image/svg+xml" : null);
    if (!mime) return undefined;
    return `data:${mime};base64,${base64(bytes)}`;
  } catch {
    return undefined;
  }
}
