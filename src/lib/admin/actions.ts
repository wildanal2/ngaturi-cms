"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { musicTracks, templates, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/helpers";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);
}

export async function upsertMusicTrack(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const audioUrl = String(formData.get("audio_url") ?? "").trim();
  if (!title || !audioUrl) return;
  const id =
    String(formData.get("id") ?? "").trim() ||
    `${slugify(title)}-${Math.random().toString(36).slice(2, 5)}`;
  const values = {
    id,
    title,
    audioUrl,
    artist: String(formData.get("artist") ?? "").trim() || null,
    coverUrl: String(formData.get("cover_url") ?? "").trim() || null,
    license: String(formData.get("license") ?? "").trim() || null,
    attribution: String(formData.get("attribution") ?? "").trim() || null,
    genre: String(formData.get("genre") ?? "").trim() || null,
    sortOrder: Number(formData.get("sort_order")) || 0,
    isActive: formData.get("is_active") === "on",
  };
  await db
    .insert(musicTracks)
    .values(values)
    .onConflictDoUpdate({ target: musicTracks.id, set: values });
  revalidatePath("/admin/music");
}

export async function deleteMusicTrack(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(musicTracks).where(eq(musicTracks.id, id));
  revalidatePath("/admin/music");
}

export async function setUserRole(
  userId: string,
  role: "user" | "admin" | "moderator",
): Promise<void> {
  await requireAdmin();
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export async function setUserStatus(
  userId: string,
  status: "active" | "suspended" | "deleted",
): Promise<void> {
  await requireAdmin();
  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export async function toggleTemplateActive(
  templateId: string,
  isActive: boolean,
): Promise<void> {
  await requireAdmin();
  await db
    .update(templates)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(templates.id, templateId));
  revalidatePath("/admin/templates");
}

export async function toggleTemplateFeatured(
  templateId: string,
  isFeatured: boolean,
): Promise<void> {
  await requireAdmin();
  await db
    .update(templates)
    .set({ isFeatured, updatedAt: new Date() })
    .where(eq(templates.id, templateId));
  revalidatePath("/admin/templates");
}
