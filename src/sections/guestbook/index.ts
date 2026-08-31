import type { SectionDefinition } from "../types";
import { GuestbookProps } from "../schema";
import { GuestbookCards } from "./guestbook-cards";
import { GuestbookChat } from "./guestbook-chat";

export { GuestbookCards, GuestbookChat };

export const guestbookSection: SectionDefinition = {
  type: "guestbook",
  name: "Buku Tamu",
  description: "Ucapan & doa dari tamu",
  icon: "MessageCircleHeart",
  category: "interactive",
  variants: {
    cards: {
      name: "Kartu",
      component: GuestbookCards,
      propsSchema: GuestbookProps,
      fields: [
        { kind: "boolean", key: "require_approval", label: "Ucapan perlu disetujui dulu" },
      ],
      defaultProps: { require_approval: true },
    },
    chat: {
      name: "Gaya Chat",
      description: "Balon chat + avatar + penghitung karakter",
      component: GuestbookChat,
      propsSchema: GuestbookProps,
      fields: [
        { kind: "boolean", key: "require_approval", label: "Ucapan perlu disetujui dulu" },
      ],
      defaultProps: { require_approval: true },
    },
  },
};
