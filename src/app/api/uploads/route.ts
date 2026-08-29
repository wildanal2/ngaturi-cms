import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations, mediaAssets } from "@/lib/db/schema";
import { s3, S3_BUCKET, publicUrl } from "@/lib/storage";
import { env } from "@/lib/env";

// Foto diproses di server: auto-rotate, resize (sisi terpanjang ≤ 1920 =
// "1080p" untuk landscape), konversi ke WebP. Lewat route ini agar tidak
// kena CORS presigned-PUT dan kita bisa optimasi.
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_EDGE = 1920;
const WEBP_QUALITY = 82;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const invitationId = String(form?.get("invitationId") ?? "");
  if (!(file instanceof File) || !invitationId) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File harus gambar." }, { status: 415 });
  }
  if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `Ukuran maksimal ${env.MAX_UPLOAD_MB} MB.` },
      { status: 413 },
    );
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
    return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
  }

  let out: Buffer;
  let width: number | undefined;
  let height: number | undefined;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(input, { failOn: "none" })
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY });
    const result = await pipeline.toBuffer({ resolveWithObject: true });
    out = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    return NextResponse.json(
      { error: "Gambar tidak bisa diproses." },
      { status: 422 },
    );
  }

  const key = `invitations/${invitationId}/${crypto.randomUUID()}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: out,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = publicUrl(key);

  await db
    .insert(mediaAssets)
    .values({
      userId: session.user.id,
      invitationId,
      originalFilename: file.name.slice(0, 255),
      fileKey: key,
      fileUrl: url,
      fileSize: out.length,
      mimeType: "image/webp",
      mediaType: "image",
      width,
      height,
      isProcessed: true,
    })
    .catch(() => {});

  return NextResponse.json({ publicUrl: url, key, width, height });
}
