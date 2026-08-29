"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/helpers";

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
