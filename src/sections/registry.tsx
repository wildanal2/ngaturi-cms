import type { Field, SectionDefinition } from "./types";
import {
  HeroCentered,
  HeroSplit,
  HeroMinimal,
  HeroArch,
  CoupleSideBySide,
  CoupleStacked,
  CouplePolaroid,
  EventTimeline,
  EventCards,
  GalleryGrid,
  GalleryMasonry,
  GalleryCarousel,
  QuoteCentered,
  QuoteBordered,
  GiftCards,
  GiftMinimal,
} from "./static-parts";
import {
  CountdownMinimal,
  CountdownFlip,
  CountdownRings,
  CountdownPill,
  CountdownElegant,
} from "./countdown";
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

const personFields = (prefix: string): Field => ({
  kind: "group",
  label: prefix === "bride" ? "Mempelai Wanita" : "Mempelai Pria",
  fields: [
    { kind: "text", key: `${prefix}.full_name`, label: "Nama lengkap" },
    { kind: "text", key: `${prefix}.child_order`, label: "Anak ke- / bin/binti" },
    { kind: "text", key: `${prefix}.parents`, label: "Nama orang tua" },
    { kind: "text", key: `${prefix}.instagram`, label: "Instagram (tanpa @)" },
    { kind: "image", key: `${prefix}.photo`, label: "Foto" },
  ],
});

export const SectionRegistry: Record<string, SectionDefinition> = {
  hero: {
    type: "hero",
    name: "Sampul / Pembuka",
    description: "Bagian pertama yang dilihat tamu",
    icon: "Sparkles",
    category: "hero",
    fields: [
      { kind: "text", key: "couple_names", label: "Nama", help: "contoh: Dinda & Raka" },
      { kind: "text", key: "tagline", label: "Tagline", help: "contoh: The Wedding Of" },
      { kind: "date", key: "event_date", label: "Tanggal acara" },
      { kind: "image", key: "background_image", label: "Foto latar" },
      { kind: "boolean", key: "has_countdown", label: "Tampilkan hitung mundur di sampul" },
    ],
    variants: {
      centered: {
        name: "Foto Fullscreen",
        description: "Foto memenuhi layar dengan teks di tengah",
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
        description: "Foto di satu sisi, teks di sisi lain",
        component: HeroSplit,
        propsSchema: HeroProps,
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
        },
      },
      minimal: {
        name: "Minimalis",
        description: "Tipografi besar tanpa foto",
        component: HeroMinimal,
        propsSchema: HeroProps,
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
        },
      },
      arch: {
        name: "Foto Melengkung",
        description: "Foto arch + bingkai ornamen",
        component: HeroArch,
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
    icon: "Users",
    category: "content",
    fields: [personFields("bride"), personFields("groom")],
    variants: {
      "side-by-side": {
        name: "Bersebelahan",
        component: CoupleSideBySide,
        propsSchema: CoupleIntroProps,
        defaultProps: {
          bride: { name: "Dinda", full_name: "Dinda Ayu Pratiwi", child_order: "Putri kedua dari" },
          groom: { name: "Raka", full_name: "Raka Wibowo", child_order: "Putra pertama dari" },
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
      polaroid: {
        name: "Polaroid",
        description: "Kartu foto miring bergaya polaroid",
        component: CouplePolaroid,
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
    icon: "CalendarClock",
    category: "content",
    fields: [
      {
        kind: "array",
        key: "events",
        label: "Acara",
        addLabel: "Tambah acara",
        itemLabel: "Acara",
        defaultItem: {
          name: "Resepsi",
          date: nowPlus(45),
          start_time: "11:00",
          end_time: "14:00",
          venue_name: "",
          address: "",
          maps_url: "",
        },
        itemFields: [
          { kind: "text", key: "name", label: "Nama acara" },
          { kind: "date", key: "date", label: "Tanggal" },
          { kind: "text", key: "start_time", label: "Jam mulai", help: "contoh: 08:00" },
          { kind: "text", key: "end_time", label: "Jam selesai" },
          { kind: "text", key: "venue_name", label: "Nama tempat" },
          { kind: "textarea", key: "address", label: "Alamat" },
          { kind: "url", key: "maps_url", label: "Link Google Maps" },
        ],
      },
    ],
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
      cards: {
        name: "Kartu Berdampingan",
        description: "Dua kartu acara sejajar",
        component: EventCards,
        propsSchema: EventDetailsProps,
        defaultProps: {
          events: [
            {
              name: "Akad Nikah",
              date: nowPlus(45),
              start_time: "08:00",
              venue_name: "Masjid Al-Falah",
            },
            {
              name: "Resepsi",
              date: nowPlus(45),
              start_time: "11:00",
              venue_name: "Gedung Serbaguna",
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
    icon: "Timer",
    category: "interactive",
    fields: [
      { kind: "date", key: "target_date", label: "Tanggal target" },
      { kind: "text", key: "message_expired", label: "Pesan setelah lewat" },
    ],
    variants: {
      minimal: {
        name: "Kotak Minimalis",
        component: CountdownMinimal,
        propsSchema: CountdownProps,
        defaultProps: { target_date: nowPlus(45) },
      },
      flip: {
        name: "Flip Clock",
        description: "Kartu gelap bergaya jam flip",
        component: CountdownFlip,
        propsSchema: CountdownProps,
        defaultProps: { target_date: nowPlus(45) },
      },
      rings: {
        name: "Cincin Progres",
        description: "Lingkaran progres warna",
        component: CountdownRings,
        propsSchema: CountdownProps,
        defaultProps: { target_date: nowPlus(45) },
      },
      pill: {
        name: "Satu Baris",
        description: "Ringkas dalam satu pill",
        component: CountdownPill,
        propsSchema: CountdownProps,
        defaultProps: { target_date: nowPlus(45) },
      },
      elegant: {
        name: "Serif Elegan",
        description: "Angka serif besar dengan titik pemisah",
        component: CountdownElegant,
        propsSchema: CountdownProps,
        defaultProps: { target_date: nowPlus(45) },
      },
    },
  },

  gallery: {
    type: "gallery",
    name: "Galeri",
    description: "Kumpulan foto",
    icon: "Images",
    category: "content",
    fields: [
      {
        kind: "select",
        key: "columns",
        label: "Jumlah kolom",
        options: [
          { value: "2", label: "2 kolom" },
          { value: "3", label: "3 kolom" },
          { value: "4", label: "4 kolom" },
        ],
      },
      {
        kind: "array",
        key: "images",
        label: "Foto",
        addLabel: "Tambah foto",
        itemLabel: "Foto",
        defaultItem: { url: "", caption: "" },
        itemFields: [
          { kind: "image", key: "url", label: "Gambar" },
          { kind: "text", key: "caption", label: "Keterangan" },
        ],
      },
    ],
    variants: {
      grid: {
        name: "Grid Rapi",
        component: GalleryGrid,
        propsSchema: GalleryProps,
        defaultProps: { images: [], columns: 3 },
      },
      masonry: {
        name: "Masonry",
        description: "Tinggi foto bervariasi",
        component: GalleryMasonry,
        propsSchema: GalleryProps,
        defaultProps: { images: [], columns: 3 },
      },
      carousel: {
        name: "Carousel Geser",
        description: "Geser horizontal dengan snap",
        component: GalleryCarousel,
        propsSchema: GalleryProps,
        defaultProps: { images: [], columns: 3 },
      },
    },
  },

  quote: {
    type: "quote",
    name: "Kutipan",
    description: "Ayat atau kutipan",
    icon: "Quote",
    category: "content",
    fields: [
      { kind: "textarea", key: "text", label: "Teks kutipan" },
      { kind: "text", key: "source", label: "Sumber" },
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
      bordered: {
        name: "Garis Ornamen",
        description: "Kutipan dengan garis rambut atas–bawah",
        component: QuoteBordered,
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
    icon: "CircleCheck",
    category: "interactive",
    fields: [
      { kind: "boolean", key: "require_phone", label: "Wajib nomor WhatsApp" },
      {
        kind: "select",
        key: "max_guests_per_person",
        label: "Maks. tamu per orang",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "5", label: "5" },
        ],
      },
      { kind: "date", key: "deadline", label: "Batas waktu RSVP (opsional)" },
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
    icon: "MessageCircleHeart",
    category: "interactive",
    fields: [
      {
        kind: "boolean",
        key: "require_approval",
        label: "Ucapan perlu disetujui dulu",
      },
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
    description: "Rekening & e-wallet hadiah",
    icon: "Gift",
    category: "content",
    fields: [
      { kind: "textarea", key: "intro", label: "Kalimat pembuka" },
      {
        kind: "array",
        key: "bank_accounts",
        label: "Rekening",
        addLabel: "Tambah rekening",
        itemLabel: "Rekening",
        defaultItem: { bank_name: "", account_number: "", account_name: "" },
        itemFields: [
          { kind: "text", key: "bank_name", label: "Bank / e-wallet" },
          { kind: "text", key: "account_number", label: "Nomor rekening" },
          { kind: "text", key: "account_name", label: "Atas nama" },
        ],
      },
    ],
    variants: {
      cards: {
        name: "Kartu Bank",
        component: GiftCards,
        propsSchema: GiftProps,
        defaultProps: {
          intro:
            "Doa restu Anda merupakan karunia yang sangat berarti. Namun jika memberi lebih, dapat melalui:",
          bank_accounts: [
            { bank_name: "BCA", account_number: "1234567890", account_name: "Dinda Ayu Pratiwi" },
          ],
        },
      },
      minimal: {
        name: "Daftar Ringkas",
        description: "Satu blok daftar rekening",
        component: GiftMinimal,
        propsSchema: GiftProps,
        defaultProps: {
          intro: "Kirimkan tanda kasih Anda melalui:",
          bank_accounts: [
            { bank_name: "BCA", account_number: "1234567890", account_name: "Dinda Ayu Pratiwi" },
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
