"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { guestInvites, invitations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { hasProFeatures } from "./entitlement";
import {
  BULK_GUEST_MAX,
  sanitizeBulk,
  type BulkItemStatus,
  type BulkResult,
} from "./contact-import";
import { insertGuestsLocked } from "./guest-writer";
import {
  NAME_LOCKED_MESSAGE,
  canonicalCategory,
  normalizeCategory,
} from "./guest-list";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENTITLEMENT =
  "Undangan per-tamu tersedia gratis selama masa coba, atau dengan paket Premium.";
const GUEST_NAME_MAX = 200;

const token = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 10);

async function ownedInvitation(invitationId: string) {
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

export async function createGuestInvite(
  invitationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const inv = await ownedInvitation(invitationId);
  if (!hasProFeatures(inv)) {
    return {
      ok: false,
      error:
        "Undangan per-tamu tersedia gratis selama masa coba, atau dengan paket Premium.",
    };
  }
  const guestName = String(formData.get("guest_name") ?? "")
    .trim()
    .slice(0, 200);
  if (!guestName) return { ok: false, error: "Nama tamu wajib diisi." };

  const known = await db
    .select({ group: guestInvites.guestGroup })
    .from(guestInvites)
    .where(eq(guestInvites.invitationId, invitationId));
  await db.insert(guestInvites).values({
    invitationId,
    guestName,
    slugToken: token(),
    guestGroup: canonicalCategory(
      formData.get("guest_group"),
      known.map((row) => row.group),
    ),
    maxGuests: Math.max(1, Number(formData.get("max_guests")) || 2),
    whatsappPhone:
      String(formData.get("whatsapp_phone") ?? "").slice(0, 50) || null,
  });
  revalidatePath(`/invitations/${invitationId}/guests`);
  return { ok: true };
}

/**
 * Adds several guests chosen from the device contacts. Input is re-validated
 * here; an item that already exists (same number, or same name when neither has
 * one) is skipped, so a retry after a partial failure cannot duplicate guests.
 * Nothing is sent over WhatsApp.
 */
export async function createGuestInvitesBulk(
  invitationId: string,
  input: unknown,
): Promise<BulkResult> {
  const inv = await ownedInvitation(invitationId);
  if (!hasProFeatures(inv)) {
    return {
      ok: false,
      error:
        "Undangan per-tamu tersedia gratis selama masa coba, atau dengan paket Premium.",
    };
  }
  const items = sanitizeBulk(input, 10);
  if (!items)
    return {
      ok: false,
      error: `Daftar tamu tidak valid (1 sampai ${BULK_GUEST_MAX} kontak).`,
    };

  let statuses: BulkItemStatus[];
  try {
    // Same locked transaction as the delegate writer: duplicates are decided
    // after the invitation lock, each insert has its own savepoint.
    const out = await insertGuestsLocked({
      database: db,
      invitationId,
      scope: undefined,
      items,
      makeToken: token,
      dedupe: true,
      cap: null,
    });
    if (out.aborted) return { ok: false, error: "Gagal menyimpan tamu." };
    statuses = out.statuses;
  } catch {
    return { ok: false, error: "Gagal menyimpan tamu. Silakan coba lagi." };
  }
  const added = statuses.filter((status) => status === "added").length;
  if (added) revalidatePath(`/invitations/${invitationId}/guests`);
  return { ok: true, statuses, added };
}

/**
 * Rename is one conditional UPDATE: it only matches while the guest has not been
 * sent or opened, so it cannot race with the status changes. The id, personal
 * token, number, RSVP and status are untouched.
 */
export async function renameGuestInvite(
  invitationId: string,
  guestId: string,
  name: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const inv = await ownedInvitation(invitationId);
  if (!hasProFeatures(inv)) return { ok: false, error: NO_ENTITLEMENT };
  if (typeof guestId !== "string" || !UUID_RE.test(guestId))
    return { ok: false, error: "Tamu tidak ditemukan." };
  const guestName = (typeof name === "string" ? name : "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, GUEST_NAME_MAX);
  if (!guestName) return { ok: false, error: "Nama tamu wajib diisi." };
  const changed = await db
    .update(guestInvites)
    .set({ guestName })
    .where(
      and(
        eq(guestInvites.id, guestId),
        eq(guestInvites.invitationId, invitationId),
        eq(guestInvites.isSent, false),
        isNull(guestInvites.openedAt),
      ),
    )
    .returning({ id: guestInvites.id });
  if (changed.length) {
    revalidatePath(`/invitations/${invitationId}/guests`);
    return { ok: true };
  }
  const [exists] = await db
    .select({ id: guestInvites.id })
    .from(guestInvites)
    .where(
      and(
        eq(guestInvites.id, guestId),
        eq(guestInvites.invitationId, invitationId),
      ),
    )
    .limit(1);
  // Refused: the page re-reads, so a stale card shows the real status.
  revalidatePath(`/invitations/${invitationId}/guests`);
  return {
    ok: false,
    error: exists ? NAME_LOCKED_MESSAGE : "Tamu tidak ditemukan.",
  };
}

/** Category can change at any time; an empty value removes it. */
export async function setGuestCategory(
  invitationId: string,
  guestId: string,
  category: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const inv = await ownedInvitation(invitationId);
  if (!hasProFeatures(inv)) return { ok: false, error: NO_ENTITLEMENT };
  if (typeof guestId !== "string" || !UUID_RE.test(guestId))
    return { ok: false, error: "Tamu tidak ditemukan." };
  const known = normalizeCategory(category)
    ? await db
        .select({ group: guestInvites.guestGroup })
        .from(guestInvites)
        .where(eq(guestInvites.invitationId, invitationId))
    : [];
  const changed = await db
    .update(guestInvites)
    .set({
      guestGroup: canonicalCategory(
        category,
        known.map((row) => row.group),
      ),
    })
    .where(
      and(
        eq(guestInvites.id, guestId),
        eq(guestInvites.invitationId, invitationId),
      ),
    )
    .returning({ id: guestInvites.id });
  if (!changed.length) return { ok: false, error: "Tamu tidak ditemukan." };
  revalidatePath(`/invitations/${invitationId}/guests`);
  return { ok: true };
}

export async function deleteGuestInvite(
  invitationId: string,
  guestId: string,
): Promise<void> {
  await ownedInvitation(invitationId);
  await db
    .delete(guestInvites)
    .where(
      and(
        eq(guestInvites.id, guestId),
        eq(guestInvites.invitationId, invitationId),
      ),
    );
  revalidatePath(`/invitations/${invitationId}/guests`);
}

export async function markGuestSent(
  invitationId: string,
  guestId: string,
): Promise<void> {
  await ownedInvitation(invitationId);
  await db
    .update(guestInvites)
    .set({ isSent: true, sentAt: new Date() })
    .where(
      and(
        eq(guestInvites.id, guestId),
        eq(guestInvites.invitationId, invitationId),
      ),
    );
  revalidatePath(`/invitations/${invitationId}/guests`);
}
