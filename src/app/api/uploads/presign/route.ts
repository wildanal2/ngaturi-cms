import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/helpers";
import { getDb } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { legacyPublicUrl, presignPut } from "@/lib/storage";
import { env } from "@/lib/env";
import {
  canEditInvitation,
  canUploadMedia,
} from "@/lib/invitation/entitlement";
import { countGalleryPhotos } from "@/lib/invitation/composition-entitlement";
import type { SectionData } from "@/sections/types";

const Body = z.object({
  invitationId: z.string().uuid(),
  filename: z.string().min(1).max(200),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif|avif)$/),
  size: z.number().int().positive(),
});

export async function POST(req: Request) {
  const db = getDb();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const { invitationId, filename, contentType, size } = parsed.data;

  if (size > env.MAX_UPLOAD_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `Ukuran maksimal ${env.MAX_UPLOAD_MB} MB.` },
      { status: 413 },
    );
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
  if (
    !canUploadMedia(
      inv,
      "image",
      countGalleryPhotos(inv.sections as SectionData[]),
    )
  ) {
    const error = !canEditInvitation(inv)
      ? "Masa edit gratis sudah berakhir."
      : "Paket Basic mendukung maksimal 30 foto galeri.";
    return NextResponse.json({ error }, { status: 403 });
  }

  const ext =
    filename
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `invitations/${invitationId}/${crypto.randomUUID()}.${ext}`;
  const uploadUrl = await presignPut(key, contentType);

  return NextResponse.json({
    uploadUrl,
    key,
    publicUrl: legacyPublicUrl(key),
  });
}
