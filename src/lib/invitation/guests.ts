"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { guestInvites, invitations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { hasProFeatures } from "./entitlement";
import {
  findBulkDuplicates,
  sanitizeBulk,
  type BulkItemStatus,
  type BulkResult,
} from "./contact-import";

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

  await db.insert(guestInvites).values({
    invitationId,
    guestName,
    slugToken: token(),
    guestGroup: String(formData.get("guest_group") ?? "").slice(0, 100) || null,
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
      error: "Daftar tamu tidak valid (1 sampai 100 kontak).",
    };

  const statuses: BulkItemStatus[] = [];
  let added = 0;
  try {
    const existing = await db
      .select({
        name: guestInvites.guestName,
        phone: guestInvites.whatsappPhone,
      })
      .from(guestInvites)
      .where(eq(guestInvites.invitationId, invitationId));
    const duplicates = findBulkDuplicates(items, existing);
    for (const [i, item] of items.entries()) {
      if (!item.name) statuses.push("invalid");
      else if (duplicates[i]) statuses.push("duplicate");
      else {
        try {
          await db.insert(guestInvites).values({
            invitationId,
            guestName: item.name,
            slugToken: token(),
            guestGroup: item.group,
            maxGuests: item.maxGuests,
            whatsappPhone: item.phone,
          });
          statuses.push("added");
          added++;
        } catch {
          statuses.push("failed");
        }
      }
    }
  } catch {
    return { ok: false, error: "Gagal menyimpan tamu. Silakan coba lagi." };
  }
  if (added) revalidatePath(`/invitations/${invitationId}/guests`);
  return { ok: true, statuses, added };
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
