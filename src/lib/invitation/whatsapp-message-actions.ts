"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { hasProFeatures } from "./entitlement";
import {
  DEFAULT_WHATSAPP_MESSAGE,
  validateWhatsappMessage,
  type WhatsappTemplate,
} from "./whatsapp-message";

type Result =
  { ok: true; template: WhatsappTemplate } | { ok: false; error: string };

function defaultTemplate(): WhatsappTemplate {
  return {
    message: DEFAULT_WHATSAPP_MESSAGE,
    source: "default",
    isCustom: false,
  };
}

async function ownedInvitation(invitationId: string) {
  const session = await requireUser();
  if (
    typeof invitationId !== "string" ||
    !invitationId ||
    invitationId.length > 200
  )
    throw new Error("Undangan tidak ditemukan.");
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
  if (!inv) throw new Error("Undangan tidak ditemukan.");
  return {
    inv,
    key: `ngaturi:whatsapp:message:v1:${encodeURIComponent(session.user.id)}:${encodeURIComponent(inv.id)}`,
  };
}

/** GET equivalent. Auth/ownership failures never fall back to Redis reads. */
export async function getWhatsappTemplate(
  invitationId: string,
): Promise<WhatsappTemplate> {
  const { key } = await ownedInvitation(invitationId);
  try {
    const message = await redis.get(key);
    if (message === null) return defaultTemplate();
    if (validateWhatsappMessage(message))
      throw new Error("Invalid stored template");
    return { message, source: "custom", isCustom: true };
  } catch {
    return {
      ...defaultTemplate(),
      readError:
        "Pesan tersimpan belum dapat dibaca. Pesan default digunakan sementara. Muat ulang sebelum mengubah pesan.",
    };
  }
}

/** PUT equivalent. No TTL and no database writes. */
export async function saveWhatsappTemplate(
  invitationId: string,
  message: string,
): Promise<Result> {
  const { inv, key } = await ownedInvitation(invitationId);
  if (!hasProFeatures(inv))
    return {
      ok: false,
      error: "Edit pesan tersedia selama masa coba atau dengan paket Premium.",
    };
  const error = validateWhatsappMessage(message);
  if (error) return { ok: false, error };
  try {
    // Saving the exact source default means opting back into future defaults.
    if (message === DEFAULT_WHATSAPP_MESSAGE) {
      await redis.delete(key);
      revalidatePath(`/invitations/${invitationId}/guests`);
      return { ok: true, template: defaultTemplate() };
    }
    await redis.set(key, message);
    revalidatePath(`/invitations/${invitationId}/guests`);
    return {
      ok: true,
      template: { message, source: "custom", isCustom: true },
    };
  } catch {
    return { ok: false, error: "Gagal menyimpan pesan. Silakan coba lagi." };
  }
}

/** DELETE equivalent. Explicit reset remains available after trial expiry. */
export async function resetWhatsappTemplate(
  invitationId: string,
): Promise<Result> {
  const { key } = await ownedInvitation(invitationId);
  try {
    await redis.delete(key);
    revalidatePath(`/invitations/${invitationId}/guests`);
    return { ok: true, template: defaultTemplate() };
  } catch {
    return { ok: false, error: "Gagal mereset pesan. Silakan coba lagi." };
  }
}
