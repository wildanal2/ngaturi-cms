import { redis } from "@/lib/redis";
import {
  DEFAULT_WHATSAPP_MESSAGE,
  validateWhatsappMessage,
  type WhatsappTemplate,
} from "./whatsapp-message";

/** Shared by owner actions and the delegate page (not a "use server" module). */
export function whatsappMessageKey(userId: string, invitationId: string) {
  return `ngaturi:whatsapp:message:v1:${encodeURIComponent(userId)}:${encodeURIComponent(invitationId)}`;
}

export function defaultWhatsappTemplate(): WhatsappTemplate {
  return {
    message: DEFAULT_WHATSAPP_MESSAGE,
    source: "default",
    isCustom: false,
  };
}

/** Read-only. Failures fall back to the default and never touch the stored value. */
export async function readWhatsappTemplate(
  key: string,
): Promise<WhatsappTemplate> {
  try {
    const message = await redis.get(key);
    if (message === null) return defaultWhatsappTemplate();
    if (validateWhatsappMessage(message))
      throw new Error("Invalid stored template");
    return { message, source: "custom", isCustom: true };
  } catch {
    return {
      ...defaultWhatsappTemplate(),
      readError:
        "Pesan tersimpan belum dapat dibaca. Pesan default digunakan sementara. Muat ulang sebelum mengubah pesan.",
    };
  }
}
