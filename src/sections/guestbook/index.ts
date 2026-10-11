import { GuestbookCinematicVintage } from "./guestbook-cinematic-vintage";
import type { SectionDefinition } from "../types";
import { GuestbookProps } from "../schema";
import { GuestbookCards } from "./guestbook-cards";
import { GuestbookChat } from "./guestbook-chat";
import { GuestbookSerambiDelima } from "./guestbook-serambi-delima";

export { GuestbookCards, GuestbookChat, GuestbookSerambiDelima };

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

guestbookSection.variants["cinematic-vintage"] = {
  ...guestbookSection.variants["chat"],
  name: "Cinematic Vintage",
  component: GuestbookCinematicVintage,
};

guestbookSection.variants["serambi-delima"] = {
  ...guestbookSection.variants.chat,
  name: "Serambi Delima",
  description: "Ucapan dan doa dalam kartu gading dengan detail emas",
  component: GuestbookSerambiDelima,
  isPremium: true,
};
