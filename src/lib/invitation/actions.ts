"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invitations,
  payments,
  templates,
  userProfiles,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { getTemplate } from "@/lib/templates/catalog";
import {
  hydrateTemplateSections,
  mergeInvitationGlobalSettings,
  mergeInvitationIntoTemplate,
} from "@/lib/templates/hydrate";
import { isTemplateChangeCategoryCompatible } from "@/lib/templates/compatibility";
import { makeSlug, validateCustomSlug } from "./slug";
import { CompositionSchema } from "@/sections/schema";
import type { SectionData } from "@/sections/types";
import {
  editExpiresAtFor,
  isEditLocked,
  maxInvitationsFor,
} from "./entitlement";

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

    // Catalog presets are code-backed. Materialize the selected row before
    // writing source_template so newly added presets satisfy the database FK
    // even when an older environment has not rerun the seed command yet.
    await tx
      .insert(templates)
      .values({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        tier: template.tier,
        thumbnail: template.thumbnail,
        composition: {
          global_settings: template.global_settings,
          sections: template.sections,
        },
        isActive: true,
      })
      .onConflictDoNothing();

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

export async function applyInitialTemplate(
  invitationId: string,
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const template = getTemplate(templateId);
  if (!template) return { ok: false, error: "Template tidak ditemukan." };

  const sections = hydrateTemplateSections(template).map((section) => ({
    ...section,
    id: crypto.randomUUID(),
  }));

  try {
    const result = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.userId, session.user.id),
          ),
        )
        .for("update")
        .limit(1);

      if (!inv) {
        return { ok: false as const, error: "Undangan tidak ditemukan." };
      }
      if (isEditLocked(inv) || inv.isEditLocked) {
        return {
          ok: false as const,
          error: "Masa edit gratis sudah berakhir.",
        };
      }

      // A valid catalog identity means initial selection already happened.
      // This also makes a second concurrent request harmless.
      if (inv.sourceTemplate && getTemplate(inv.sourceTemplate)) {
        return { ok: true as const };
      }

      // source_template is an FK. Keep code-backed catalog entries usable even
      // when the seed command has not yet registered this template row.
      await tx
        .insert(templates)
        .values({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          tier: template.tier,
          thumbnail: template.thumbnail,
          composition: {
            global_settings: template.global_settings,
            sections: template.sections,
          },
          isActive: true,
        })
        .onConflictDoNothing();

      await tx
        .update(invitations)
        .set({
          sourceTemplate: template.id,
          sections,
          globalSettings: template.global_settings,
          eventType: template.category,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.userId, session.user.id),
          ),
        );

      return { ok: true as const };
    });

    if (result.ok) {
      updateTag(`invitation:${invitationId}`);
      refresh();
    }
    return result;
  } catch {
    return {
      ok: false,
      error: "Template gagal diterapkan. Silakan coba lagi.",
    };
  }
}

export async function changeInvitationTemplate(
  invitationId: string,
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const targetTemplate = getTemplate(templateId);
  if (!targetTemplate) {
    return { ok: false, error: "Template tidak ditemukan." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.userId, session.user.id),
          ),
        )
        .for("update")
        .limit(1);

      if (!inv) {
        return { ok: false as const, error: "Undangan tidak ditemukan." };
      }
      if (isEditLocked(inv) || inv.isEditLocked) {
        return {
          ok: false as const,
          error: "Masa edit gratis sudah berakhir.",
        };
      }
      if (inv.sourceTemplate === targetTemplate.id) {
        return { ok: true as const, slug: inv.slug };
      }

      const sourceTemplate = inv.sourceTemplate
        ? getTemplate(inv.sourceTemplate)
        : undefined;
      if (!sourceTemplate) {
        return {
          ok: false as const,
          error: "Template aktif tidak dikenali. Muat ulang Builder.",
        };
      }
      if (
        !isTemplateChangeCategoryCompatible({
          invitationCategory: inv.eventType,
          sourceCategory: sourceTemplate.category,
          targetCategory: targetTemplate.category,
        })
      ) {
        return {
          ok: false as const,
          error: "Template harus memiliki kategori yang sama dengan undangan.",
        };
      }

      const currentSections = inv.sections as SectionData[];
      const sections = mergeInvitationIntoTemplate(
        currentSections,
        sourceTemplate,
        targetTemplate,
      );
      const globalSettings = mergeInvitationGlobalSettings(
        inv.globalSettings as Record<string, unknown>,
        targetTemplate.global_settings as unknown as Record<string, unknown>,
        (sourceTemplate.composition ?? "standard") !== "standard",
        (targetTemplate.composition ?? "standard") !== "standard",
      );

      // source_template is an FK; catalog entries are lazily registered using
      // the same contract as initial template selection.
      await tx
        .insert(templates)
        .values({
          id: targetTemplate.id,
          name: targetTemplate.name,
          description: targetTemplate.description,
          category: targetTemplate.category,
          tier: targetTemplate.tier,
          thumbnail: targetTemplate.thumbnail,
          composition: {
            global_settings: targetTemplate.global_settings,
            sections: targetTemplate.sections,
          },
          isActive: true,
        })
        .onConflictDoNothing();

      await tx
        .update(invitations)
        .set({
          sourceTemplate: targetTemplate.id,
          sections,
          globalSettings,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.userId, session.user.id),
          ),
        );

      return { ok: true as const, slug: inv.slug };
    });

    if (result.ok) {
      updateTag(`invitation:${invitationId}`);
      updateTag(`invitation:slug:${result.slug}`);
      refresh();
    }
    return result.ok ? { ok: true } : result;
  } catch {
    return {
      ok: false,
      error: "Template gagal diterapkan. Silakan coba lagi.",
    };
  }
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
  payload: {
    sections: unknown;
    global_settings: unknown;
    source_template: string;
  },
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const inv = await loadOwned(invitationId);
  if (isEditLocked(inv) || inv.isEditLocked) {
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
  const [updated] = await db
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
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.userId, inv.userId),
        eq(invitations.sourceTemplate, payload.source_template),
      ),
    )
    .returning({ id: invitations.id });

  if (!updated) {
    return {
      ok: false,
      error: "Template undangan telah berubah. Muat ulang Builder.",
    };
  }

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

/** Ganti nama tautan (slug) undangan. */
export async function updateInvitationSlug(
  invitationId: string,
  rawSlug: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const inv = await loadOwned(invitationId);

  const v = validateCustomSlug(rawSlug);
  if ("error" in v) return { ok: false, error: v.error };
  if (v.slug === inv.slug) return { ok: true, slug: inv.slug };

  const [taken] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(eq(invitations.slug, v.slug))
    .limit(1);
  if (taken) {
    return { ok: false, error: "Nama tautan itu sudah dipakai undangan lain." };
  }

  const oldSlug = inv.slug;
  await db
    .update(invitations)
    .set({ slug: v.slug, updatedAt: new Date() })
    .where(eq(invitations.id, inv.id));

  updateTag(`invitation:${inv.id}`);
  updateTag(`invitation:slug:${oldSlug}`);
  updateTag(`invitation:slug:${v.slug}`);
  return { ok: true, slug: v.slug };
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
