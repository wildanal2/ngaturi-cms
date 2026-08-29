import type { SectionDefinition } from "./types";
import {
  HeroCentered,
  HeroSplit,
  CoupleSideBySide,
  CoupleStacked,
  EventTimeline,
  GalleryGrid,
  QuoteCentered,
  GiftCards,
} from "./static-parts";
import { CountdownMinimal } from "./countdown";
import { RsvpFormCard } from "./rsvp-form";
import { GuestbookCards } from "./guestbook";
import {
  HeroProps,
  CoupleIntroProps,
  EventDetailsProps,
  GalleryProps,
  CountdownProps,
  QuoteProps,
  RsvpProps,
  GuestbookProps,
  GiftProps,
} from "./schema";

const nowPlus = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

export const SectionRegistry: Record<string, SectionDefinition> = {
  hero: {
    type: "hero",
    name: "Sampul / Pembuka",
    description: "Bagian pertama yang dilihat tamu",
    category: "hero",
    fields: [
      { key: "couple_names", label: "Nama (contoh: Dinda & Raka)", type: "text" },
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "event_date", label: "Tanggal acara", type: "date" },
      { key: "background_image", label: "Foto latar (URL)", type: "image" },
    ],
    variants: {
      centered: {
        name: "Foto Fullscreen",
        component: HeroCentered,
        propsSchema: HeroProps,
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
          overlay_opacity: 0.45,
          has_countdown: true,
        },
      },
      split: {
        name: "Split + Teks",
        component: HeroSplit,
        propsSchema: HeroProps,
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
        },
      },
    },
  },

  "couple-intro": {
    type: "couple-intro",
    name: "Mempelai",
    description: "Perkenalan kedua mempelai",
    category: "content",
    fields: [
      { key: "bride.full_name", label: "Nama lengkap mempelai wanita", type: "text" },
      { key: "bride.parents", label: "Orang tua mempelai wanita", type: "text" },
      { key: "bride.photo", label: "Foto mempelai wanita (URL)", type: "image" },
      { key: "groom.full_name", label: "Nama lengkap mempelai pria", type: "text" },
      { key: "groom.parents", label: "Orang tua mempelai pria", type: "text" },
      { key: "groom.photo", label: "Foto mempelai pria (URL)", type: "image" },
    ],
    variants: {
      "side-by-side": {
        name: "Bersebelahan",
        component: CoupleSideBySide,
        propsSchema: CoupleIntroProps,
        defaultProps: {
          bride: { name: "Dinda", full_name: "Dinda Ayu Pratiwi", child_order: "Putri kedua" },
          groom: { name: "Raka", full_name: "Raka Wibowo", child_order: "Putra pertama" },
        },
      },
      stacked: {
        name: "Bertumpuk",
        component: CoupleStacked,
        propsSchema: CoupleIntroProps,
        defaultProps: {
          bride: { name: "Dinda", full_name: "Dinda Ayu Pratiwi" },
          groom: { name: "Raka", full_name: "Raka Wibowo" },
        },
      },
    },
  },

  "event-details": {
    type: "event-details",
    name: "Rangkaian Acara",
    description: "Akad, resepsi, dan lokasi",
    category: "content",
    fields: [],
    variants: {
      timeline: {
        name: "Timeline",
        component: EventTimeline,
        propsSchema: EventDetailsProps,
        defaultProps: {
          events: [
            {
              name: "Akad Nikah",
              date: nowPlus(45),
              start_time: "08:00",
              end_time: "10:00",
              venue_name: "Masjid Al-Falah",
              address: "Jl. Melati No. 10, Bandung",
            },
            {
              name: "Resepsi",
              date: nowPlus(45),
              start_time: "11:00",
              end_time: "14:00",
              venue_name: "Gedung Serbaguna",
              address: "Jl. Melati No. 12, Bandung",
            },
          ],
        },
      },
    },
  },

  countdown: {
    type: "countdown",
    name: "Hitung Mundur",
    description: "Menuju hari-H",
    category: "interactive",
    fields: [{ key: "target_date", label: "Tanggal target", type: "date" }],
    variants: {
      minimal: {
        name: "Minimalis",
        component: CountdownMinimal,
        propsSchema: CountdownProps,
        defaultProps: { target_date: nowPlus(45) },
      },
    },
  },

  gallery: {
    type: "gallery",
    name: "Galeri",
    description: "Kumpulan foto",
    category: "content",
    fields: [
      {
        key: "columns",
        label: "Jumlah kolom",
        type: "select",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
      },
    ],
    variants: {
      grid: {
        name: "Grid",
        component: GalleryGrid,
        propsSchema: GalleryProps,
        defaultProps: { images: [], columns: 3 },
      },
    },
  },

  quote: {
    type: "quote",
    name: "Kutipan",
    description: "Ayat atau kutipan",
    category: "content",
    fields: [
      { key: "text", label: "Teks kutipan", type: "textarea" },
      { key: "source", label: "Sumber", type: "text" },
    ],
    variants: {
      centered: {
        name: "Tengah",
        component: QuoteCentered,
        propsSchema: QuoteProps,
        defaultProps: {
          text: "Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri.",
          source: "QS. Ar-Rum: 21",
        },
      },
    },
  },

  rsvp: {
    type: "rsvp",
    name: "RSVP",
    description: "Konfirmasi kehadiran",
    category: "interactive",
    fields: [
      { key: "require_phone", label: "Wajib nomor WhatsApp", type: "boolean" },
    ],
    variants: {
      "form-card": {
        name: "Form Card",
        component: RsvpFormCard,
        propsSchema: RsvpProps,
        defaultProps: { max_guests_per_person: 2, require_phone: false },
      },
    },
  },

  guestbook: {
    type: "guestbook",
    name: "Buku Tamu",
    description: "Ucapan & doa dari tamu",
    category: "interactive",
    fields: [
      { key: "require_approval", label: "Butuh persetujuan", type: "boolean" },
    ],
    variants: {
      cards: {
        name: "Kartu",
        component: GuestbookCards,
        propsSchema: GuestbookProps,
        defaultProps: { require_approval: true },
      },
    },
  },

  gift: {
    type: "gift",
    name: "Amplop Digital",
    description: "Rekening hadiah",
    category: "content",
    fields: [{ key: "intro", label: "Kalimat pembuka", type: "textarea" }],
    variants: {
      cards: {
        name: "Kartu Bank",
        component: GiftCards,
        propsSchema: GiftProps,
        defaultProps: {
          intro:
            "Doa restu Anda merupakan karunia yang sangat berarti. Namun jika memberi lebih, dapat melalui:",
          bank_accounts: [
            {
              bank_name: "BCA",
              account_number: "1234567890",
              account_name: "Dinda Ayu Pratiwi",
            },
          ],
        },
      },
    },
  },
};

export function getSectionDefinition(type: string) {
  return SectionRegistry[type];
}

export function getVariant(type: string, variant: string) {
  return SectionRegistry[type]?.variants[variant];
}

export function getAllSections() {
  return Object.values(SectionRegistry);
}
