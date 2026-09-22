import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/helpers";
import { getDb } from "@/lib/db";
import { invitations, mediaAssets } from "@/lib/db/schema";
import { isTrustedPublicUrl, publicUrl, putObject } from "@/lib/storage";
import { env } from "@/lib/env";
import { getWorkerEnv } from "@/lib/runtime/context";

// Foto diproses oleh Cloudflare Images: crop, resize sisi terpanjang hingga
// 1920, lalu konversi ke WebP. Audio tetap melewati jalur non-image.
export const maxDuration = 30;

const MAX_EDGE = 1920;
const WEBP_QUALITY = 82;

function imageStream(bytes: ArrayBuffer): ReadableStream<Uint8Array> {
  return new Response(bytes).body!;
}

export async function POST(req: Request) {
  const db = getDb();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const sourceUrl = String(form?.get("sourceUrl") ?? "");
  const invitationId = String(form?.get("invitationId") ?? "");
  const kind = String(form?.get("kind") ?? "image");
  const cropRaw = form?.get("crop");
  if (!invitationId || (!(file instanceof File) && !sourceUrl)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  // ---- AUDIO: simpan apa adanya (tanpa sharp) ----
  if (kind === "audio" && file instanceof File) {
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "File harus audio." }, { status: 415 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran audio maksimal 15 MB." },
        { status: 413 },
      );
    }
    const [own] = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!own) {
      return NextResponse.json(
        { error: "Undangan tidak ditemukan." },
        { status: 404 },
      );
    }
    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "mp3";
    const audioKey = `invitations/${invitationId}/audio/${crypto.randomUUID()}.${ext}`;
    await putObject({
      key: audioKey,
      body: await file.arrayBuffer(),
      contentType: file.type || "audio/mpeg",
      cacheControl: "public, max-age=31536000, immutable",
    });
    return NextResponse.json({ publicUrl: publicUrl(audioKey), key: audioKey });
  }
  // SSRF guard: re-crop only from our own storage
  if (sourceUrl && !isTrustedPublicUrl(sourceUrl)) {
    return NextResponse.json({ error: "Sumber tidak valid." }, { status: 400 });
  }
  if (file instanceof File) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File harus gambar." },
        { status: 415 },
      );
    }
    if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Ukuran maksimal ${env.MAX_UPLOAD_MB} MB.` },
        { status: 413 },
      );
    }
  }

  let crop: { x: number; y: number; width: number; height: number } | null =
    null;
  if (typeof cropRaw === "string" && cropRaw) {
    try {
      const c = JSON.parse(cropRaw);
      if (
        [c.x, c.y, c.width, c.height].every(
          (n) => typeof n === "number" && Number.isFinite(n),
        ) &&
        c.width > 0 &&
        c.height > 0
      ) {
        crop = c;
      }
    } catch {
      /* ignore malformed crop */
    }
  }

  const [inv] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!inv) {
    return NextResponse.json(
      { error: "Undangan tidak ditemukan." },
      { status: 404 },
    );
  }

  let out: ArrayBuffer;
  let width: number | undefined;
  let height: number | undefined;
  try {
    let input: ArrayBuffer;
    if (file instanceof File) {
      input = await file.arrayBuffer();
    } else {
      const r = await fetch(sourceUrl);
      if (!r.ok) throw new Error("source fetch failed");
      input = await r.arrayBuffer();
    }

    const images = getWorkerEnv()?.IMAGES;
    if (!images) throw new Error("Cloudflare Images binding is unavailable");

    const original = await images.info(imageStream(input));
    let pipeline = images.input(imageStream(input));

    if (crop) {
      const iw = original.width ?? 0;
      const ih = original.height ?? 0;
      const left = Math.max(0, Math.min(crop.x, iw - 1));
      const top = Math.max(0, Math.min(crop.y, ih - 1));
      const w = Math.max(1, Math.min(crop.width, iw - left));
      const h = Math.max(1, Math.min(crop.height, ih - top));
      pipeline = pipeline.transform({
        trim: { left, top, width: w, height: h },
      });
    }

    const result = await pipeline
      .transform({ width: MAX_EDGE, height: MAX_EDGE, fit: "scale-down" })
      .output({ format: "image/webp", quality: WEBP_QUALITY });
    out = await result.response().arrayBuffer();
    const processed = await images.info(imageStream(out));
    width = processed.width;
    height = processed.height;
  } catch {
    return NextResponse.json(
      { error: "Gambar tidak bisa diproses." },
      { status: 422 },
    );
  }

  const key = `invitations/${invitationId}/${crypto.randomUUID()}.webp`;
  await putObject({
    key,
    body: out,
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
  });

  const url = publicUrl(key);

  await db
    .insert(mediaAssets)
    .values({
      userId: session.user.id,
      invitationId,
      originalFilename:
        file instanceof File ? file.name.slice(0, 255) : "recrop.webp",
      fileKey: key,
      fileUrl: url,
      fileSize: out.byteLength,
      mimeType: "image/webp",
      mediaType: "image",
      width,
      height,
      isProcessed: true,
    })
    .catch(() => {});

  return NextResponse.json({ publicUrl: url, key, width, height });
}
