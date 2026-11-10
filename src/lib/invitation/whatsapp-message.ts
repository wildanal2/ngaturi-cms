/** Source of truth for users without a saved custom template. */
export const DEFAULT_WHATSAPP_MESSAGE = `*Assalamu'alaikum Wr. Wb.*

Bismillahirrahmanirrahim.

Kepada Yth.
*Bapak/Ibu/Saudara/i {nama_tamu}*

Dengan memohon rida dan rahmat Allah SWT, tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada acara pernikahan kami:

*{nama_mempelai}*

Untuk informasi lengkap mengenai waktu, tempat, dan rangkaian acara, silakan mengakses undangan digital kami melalui tautan berikut:

{link_undangan}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir serta memberikan doa restu.

Mohon maaf apabila undangan ini hanya kami sampaikan melalui pesan WhatsApp.

Atas perhatian dan doa restunya, kami mengucapkan terima kasih.

*Wassalamu'alaikum Wr. Wb.*`;

export const WHATSAPP_MESSAGE_MAX_LENGTH = 2000;
export const WHATSAPP_PLACEHOLDERS = [
  "{nama_tamu}",
  "{nama_mempelai}",
  "{link_undangan}",
] as const;

export interface WhatsappTemplate {
  message: string;
  source: "custom" | "default";
  isCustom: boolean;
  readError?: string;
}

export function validateWhatsappMessage(message: unknown): string | null {
  if (typeof message !== "string" || !message.trim())
    return "Pesan tidak boleh kosong.";
  if (message.length > WHATSAPP_MESSAGE_MAX_LENGTH)
    return `Pesan maksimal ${WHATSAPP_MESSAGE_MAX_LENGTH} karakter.`;
  if (!message.includes("{link_undangan}"))
    return "Pesan wajib mengandung {link_undangan}.";
  const remainder = message.replace(
    /\{nama_tamu\}|\{nama_mempelai\}|\{link_undangan\}/g,
    "",
  );
  if (/[{}]/.test(remainder))
    return "Variabel yang didukung hanya {nama_tamu}, {nama_mempelai}, dan {link_undangan}.";
  return null;
}

/** One pass: guest data is literal text and is never parsed as a template. */
export function renderWhatsappMessage(
  template: string,
  guestName: string,
  invitationLink: string,
  coupleNames = "Kedua Mempelai",
): string {
  return template.replace(
    /\{nama_tamu\}|\{nama_mempelai\}|\{link_undangan\}/g,
    (placeholder) =>
      placeholder === "{nama_tamu}"
        ? guestName
        : placeholder === "{nama_mempelai}"
          ? coupleNames
          : invitationLink,
  );
}

/** Same name priority as invitationSummary: cover, hero, then event title. */
export function whatsappCoupleNames(
  sections: unknown,
  eventTitle: string | null,
): string {
  const entries = Array.isArray(sections) ? sections : [];
  const cover = entries.find((section) => section?.type === "cover");
  const hero = entries.find((section) => section?.type === "hero");
  const candidates: unknown[] = [
    cover?.props?.names,
    hero?.props?.couple_names,
    eventTitle,
  ];
  return (
    candidates
      .find(
        (value): value is string => typeof value === "string" && !!value.trim(),
      )
      ?.trim() || "Kedua Mempelai"
  );
}

export function whatsappUrl(message: string, phone: string | null): string {
  const normalized = phone?.replace(/[^0-9]/g, "").replace(/^0/, "62");
  return `https://wa.me/${normalized || ""}?text=${encodeURIComponent(message)}`;
}
