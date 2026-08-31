"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, payments, userProfiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { makeSlug } from "./slug";
import { CompositionSchema } from "@/sections/schema";
import { editExpiresAtFor, isEditLocked, maxInvitationsFor } from "./entitlement";

/**
 * Buat undangan baru dari template. Kuota: 1 undangan untuk akun gratis,
 * +1 setiap kali user membeli paket (Basic / Premium).
 */
export async function createInvitation(templateId: string): Promise<never> {
  const session = await requireUser();
  const template = getTemplate(templateId);
  if (!template) throw new Error("Template tidak ditemukan");

  const sections = hydrateTemplateSections(template).map((s) => ({
    ...s,
    id: crypto.randomUUID(),
  }));

  // Enforce the quota atomically: lock the user's profile row so two
  // concurrent creates can't both pass the count check.
  const result = await db.transaction(async (tx) => {
    await tx
      .insert(userProfiles)
      .values({ userId: session.user.id })
      .onConflictDoNothing();

    const [profile] = await tx
      .select({ bonus: userProfiles.invitationQuotaBonus })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .for("update")
      .limit(1);

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(invitations)
      .where(eq(invitations.userId, session.user.id));

    if (count >= maxInvitationsFor(profile?.bonus)) {
      return { full: true as const };
    }

    const [row] = await tx
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

    await tx
      .update(userProfiles)
      .set({ freeInvitationUsed: true, updatedAt: new Date() })
      .where(eq(userProfiles.userId, session.user.id));

    return { id: row.id };
  });

  if ("full" in result) {
    redirect("/invitations?quota=full");
  }
  redirect(`/builder/${result.id}`);
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

/**
 * Hapus undangan beserta seluruh data terkait (RSVP, ucapan, kunjungan,
 * undangan per-tamu, media). Riwayat pembayaran disimpan tapi ditautkan
 * lepas dari undangan. Membebaskan kembali 1 slot kuota.
 */
export async function deleteInvitation(invitationId: string): Promise<never> {
  const inv = await loadOwned(invitationId);

  await db.transaction(async (tx) => {
    // payments.invitation_id has no ON DELETE — unlink so the row survives
    await tx
      .update(payments)
      .set({ invitationId: null })
      .where(eq(payments.invitationId, inv.id));
    // the rest (rsvp, guestbook, views, guest invites, media) cascade
    await tx.delete(invitations).where(eq(invitations.id, inv.id));
  });

  updateTag(`invitation:${inv.id}`);
  updateTag(`invitation:slug:${inv.slug}`);
  redirect("/invitations");
}
