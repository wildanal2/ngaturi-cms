import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/helpers";
import { getDb } from "@/lib/db";
import { invitations, mediaAssets } from "@/lib/db/schema";
import { isTrustedPublicUrl, publicUrl, putObject } from "@/lib/storage";
import { env } from "@/lib/env";
import { getWorkerEnv } from "@/lib/runtime/context";
import { workerImageProcessor } from "@/lib/image-processing/worker";
import {
  ImageCapacityError,
  ImageValidationError,
  type Crop,
} from "@/lib/image-processing/types";
import {
  boundedFormData,
  audioMimeMatches,
  detectAudio,
  fetchTrustedImageSource,
  MAX_AUDIO_BYTES,
  tryAcquireNodeUploadSlot,
  UploadTooLargeError,
} from "@/lib/image-processing/upload-safety";
import {
  canEditInvitation,
  canUploadMedia,
} from "@/lib/invitation/entitlement";
import { countGalleryPhotos } from "@/lib/invitation/composition-entitlement";
import type { SectionData } from "@/sections/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  const db = getDb();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const releaseNodeSlot = getWorkerEnv()
    ? () => {}
    : tryAcquireNodeUploadSlot();
  if (!releaseNodeSlot) {
    return NextResponse.json(
      { error: "Upload sedang penuh. Coba lagi." },
      { status: 503 },
    );
  }
  try {
    let form: FormData;
    try {
      form = await boundedFormData(req);
    } catch (error) {
      if (error instanceof UploadTooLargeError) {
        return NextResponse.json(
          { error: "Ukuran upload terlalu besar." },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: "Form upload tidak valid." },
        { status: 400 },
      );
    }
    const allowedFields = new Set([
      "file",
      "sourceUrl",
      "invitationId",
      "kind",
      "crop",
    ]);
    if (
      [...form.keys()].some(
        (key) => !allowedFields.has(key) || form.getAll(key).length !== 1,
      )
    ) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const file = form.get("file");
    const sourceUrl = form.get("sourceUrl");
    const invitationId = form.get("invitationId");
    const kind = form.get("kind") ?? "image";
    const cropRaw = form.get("crop");
    if (
      typeof invitationId !== "string" ||
      !invitationId ||
      (kind !== "image" && kind !== "audio") ||
      file instanceof File === (typeof sourceUrl === "string" && !!sourceUrl) ||
      (sourceUrl !== null && typeof sourceUrl !== "string") ||
      (typeof sourceUrl === "string" && sourceUrl.length > 2048) ||
      (file !== null && !(file instanceof File)) ||
      (file instanceof File && file.name.length > 255) ||
      invitationId.length > 64 ||
      (kind === "audio" && (sourceUrl || cropRaw)) ||
      (cropRaw !== null &&
        (typeof cropRaw !== "string" || cropRaw.length > 1024))
    ) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const maxImageBytes = Math.min(env.MAX_UPLOAD_MB, 10) * 1024 * 1024;
    if (
      file instanceof File &&
      file.size > (kind === "audio" ? MAX_AUDIO_BYTES : maxImageBytes)
    ) {
      return NextResponse.json(
        { error: "Ukuran upload terlalu besar." },
        { status: 413 },
      );
    }
    if (
      typeof sourceUrl === "string" &&
      sourceUrl &&
      !isTrustedPublicUrl(sourceUrl)
    ) {
      return NextResponse.json(
        { error: "Sumber tidak valid." },
        { status: 400 },
      );
    }
    let crop: Crop | null = null;
    if (cropRaw) {
      try {
        const c = JSON.parse(cropRaw);
        if (
          !c ||
          ![c.x, c.y, c.width, c.height].every(
            (n) => typeof n === "number" && Number.isFinite(n),
          ) ||
          c.width <= 0 ||
          c.height <= 0
        )
          throw new Error("invalid crop");
        crop = c;
      } catch {
        return NextResponse.json(
          { error: "Koordinat crop tidak valid." },
          { status: 400 },
        );
      }
    }

    const [inv] = await db
      .select()
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

    const galleryPhotoCount = countGalleryPhotos(inv.sections as SectionData[]);
    const mediaKind = kind;
    const mayUpload = sourceUrl
      ? canEditInvitation(inv)
      : canUploadMedia(inv, mediaKind, galleryPhotoCount);
    if (!mayUpload) {
      const error = !canEditInvitation(inv)
        ? "Masa edit gratis sudah berakhir."
        : mediaKind === "audio"
          ? "Upload musik baru memerlukan paket Premium."
          : "Paket Basic mendukung maksimal 30 foto galeri.";
      return NextResponse.json({ error }, { status: 403 });
    }

    if (kind === "audio" && file instanceof File) {
      if (!file.type.startsWith("audio/")) {
        return NextResponse.json(
          { error: "File harus audio." },
          { status: 415 },
        );
      }
      const bytes = await file.arrayBuffer();
      const detected = detectAudio(bytes);
      if (!detected || !audioMimeMatches(file.type, detected.mime)) {
        return NextResponse.json(
          { error: "Format audio tidak valid." },
          { status: 415 },
        );
      }
      const audioKey = `invitations/${invitationId}/audio/${crypto.randomUUID()}.${detected.ext}`;
      await putObject({
        key: audioKey,
        body: bytes,
        contentType: detected.mime,
        cacheControl: "public, max-age=31536000, immutable",
      });
      return NextResponse.json({
        publicUrl: publicUrl(audioKey),
        key: audioKey,
      });
    }
    if (file instanceof File) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "File harus gambar." },
          { status: 415 },
        );
      }
    }

    let out: ArrayBuffer;
    let width: number;
    let height: number;
    try {
      const workerImages = getWorkerEnv()?.IMAGES;
      const processor = workerImages
        ? workerImageProcessor(workerImages)
        : (await import("@/lib/image-processing/node")).nodeImageProcessor;
      const input =
        file instanceof File
          ? await file.arrayBuffer()
          : await fetchTrustedImageSource(sourceUrl as string, maxImageBytes);
      ({ bytes: out, width, height } = await processor.process(input, crop));
    } catch (error) {
      if (error instanceof UploadTooLargeError) {
        return NextResponse.json(
          { error: "Ukuran gambar terlalu besar." },
          { status: 413 },
        );
      }
      if (error instanceof ImageCapacityError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return NextResponse.json(
        {
          error:
            error instanceof ImageValidationError
              ? error.message
              : "Gambar tidak bisa diproses.",
        },
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
  } finally {
    releaseNodeSlot();
  }
}
