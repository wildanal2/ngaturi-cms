"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { guestInvites, invitations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { hasProFeatures } from "./entitlement";

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
  const guestName = String(formData.get("guest_name") ?? "").trim().slice(0, 200);
  if (!guestName) return { ok: false, error: "Nama tamu wajib diisi." };

  await db.insert(guestInvites).values({
    invitationId,
    guestName,
    slugToken: token(),
    guestGroup: String(formData.get("guest_group") ?? "").slice(0, 100) || null,
    maxGuests: Math.max(1, Number(formData.get("max_guests")) || 2),
    whatsappPhone: String(formData.get("whatsapp_phone") ?? "").slice(0, 50) || null,
  });
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
    .where(eq(guestInvites.id, guestId));
  revalidatePath(`/invitations/${invitationId}/guests`);
}
