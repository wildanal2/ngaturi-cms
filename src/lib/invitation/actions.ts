"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, userProfiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { getTemplate } from "@/lib/templates/catalog";
import { makeSlug } from "./slug";
import { CompositionSchema } from "@/sections/schema";
import { editExpiresAtFor, isEditLocked } from "./entitlement";

/** Buat undangan baru dari template. Enforce: 1 free_trial / user. */
export async function createInvitation(templateId: string): Promise<never> {
  const session = await requireUser();
  const template = getTemplate(templateId);
  if (!template) throw new Error("Template tidak ditemukan");

  const existingFree = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.userId, session.user.id),
        eq(invitations.plan, "free_trial"),
      ),
    )
    .limit(1);

  if (existingFree.length > 0) {
    // Sudah punya trial → arahkan untuk bayar / pakai yang ada.
    redirect(`/builder/${existingFree[0].id}`);
  }

  const sections = template.sections.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
  }));

  const [row] = await db
    .insert(invitations)
    .values({
      slug: makeSlug(template.name),
      userId: session.user.id,
      sourceTemplate: template.id,
      sections,
      globalSettings: template.global_settings,
      plan: "free_trial",
      hasWatermark: true,
      editExpiresAt: editExpiresAtFor("free_trial"),
      eventType: template.category,
      status: "draft",
    })
    .returning({ id: invitations.id });

  await db
    .insert(userProfiles)
    .values({ userId: session.user.id, freeInvitationUsed: true })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { freeInvitationUsed: true, updatedAt: new Date() },
    });

  redirect(`/builder/${row.id}`);
}

async function loadOwned(invitationId: string) {
  const session = await requireUser();
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
  if (!inv) throw new Error("Undangan tidak ditemukan");
  return inv;
}

export async function saveComposition(
  invitationId: string,
  payload: { sections: unknown; global_settings: unknown },
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const inv = await loadOwned(invitationId);
  if (isEditLocked(inv)) {
    return { ok: false, error: "Masa edit gratis sudah berakhir." };
  }
  const parsed = CompositionSchema.safeParse({
    template_version: inv.templateVersion,
    global_settings: payload.global_settings,
    sections: payload.sections,
  });
  if (!parsed.success) {
    return { ok: false, error: "Data tidak valid." };
  }

  const hero = parsed.data.sections.find((s) => s.type === "hero");
  const now = new Date();
  await db
    .update(invitations)
    .set({
      sections: parsed.data.sections,
      globalSettings: parsed.data.global_settings,
      eventTitle:
        (hero?.props?.couple_names as string | undefined) ?? inv.eventTitle,
      eventDate: hero?.props?.event_date
        ? new Date(hero.props.event_date as string)
        : inv.eventDate,
      updatedAt: now,
    })
    .where(eq(invitations.id, invitationId));

  updateTag(`invitation:${invitationId}`);
  updateTag(`invitation:slug:${inv.slug}`);
  return { ok: true, savedAt: now.toISOString() };
}

export async function publishInvitation(
  invitationId: string,
): Promise<{ ok: true; slug: string }> {
  const inv = await loadOwned(invitationId);
  const now = new Date();
  const eventDate = inv.eventDate ?? now;
  const expiresAt = new Date(eventDate.getTime() + 30 * 86_400_000);

  await db
    .update(invitations)
    .set({
      status: "published",
      publishedAt: inv.publishedAt ?? now,
      expiresAt,
      updatedAt: now,
    })
    .where(eq(invitations.id, invitationId));

  updateTag(`invitation:${invitationId}`);
  updateTag(`invitation:slug:${inv.slug}`);
  return { ok: true, slug: inv.slug };
}

export async function unpublishInvitation(invitationId: string): Promise<void> {
  const inv = await loadOwned(invitationId);
  await db
    .update(invitations)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(invitations.id, invitationId));
  updateTag(`invitation:${invitationId}`);
  updateTag(`invitation:slug:${inv.slug}`);
}
