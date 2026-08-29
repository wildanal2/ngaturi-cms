import type { Field, SectionDefinition, StyleOption } from "./types";
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
  MapEmbed,
  MapButton,
  ClosingSimple,
  ClosingPhoto,
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
  MapProps,
  ClosingProps,
} from "./schema";

const nowPlus = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

/* ---- shared field groups ---- */

const heroBase: Field[] = [
  { kind: "text", key: "couple_names", label: "Nama", help: "contoh: Dinda & Raka" },
  { kind: "text", key: "tagline", label: "Tagline", help: "contoh: The Wedding Of" },
  { kind: "date", key: "event_date", label: "Tanggal acara" },
];

const person = (prefix: "bride" | "groom"): Field => ({
  kind: "group",
  label: prefix === "bride" ? "Mempelai Wanita" : "Mempelai Pria",
  fields: [
    { kind: "text", key: `${prefix}.full_name`, label: "Nama lengkap" },
    { kind: "text", key: `${prefix}.child_order`, label: "Anak ke- / bin·binti" },
    { kind: "text", key: `${prefix}.parents`, label: "Nama orang tua" },
    { kind: "text", key: `${prefix}.instagram`, label: "Instagram (tanpa @)" },
    { kind: "image", key: `${prefix}.photo`, label: "Foto" },
  ],
});
const coupleFields: Field[] = [person("bride"), person("groom")];

const eventsArray: Field = {
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
    { kind: "text", key: "start_time", label: "Jam mulai", help: "cth: 08:00" },
    { kind: "text", key: "end_time", label: "Jam selesai" },
    { kind: "text", key: "venue_name", label: "Nama tempat" },
    { kind: "textarea", key: "address", label: "Alamat" },
    { kind: "url", key: "maps_url", label: "Link Google Maps" },
  ],
};

const imagesArray: Field = {
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
};

const columnsField: Field = {
  kind: "select",
  key: "columns",
  label: "Jumlah kolom",
  options: [
    { value: "2", label: "2 kolom" },
    { value: "3", label: "3 kolom" },
    { value: "4", label: "4 kolom" },
  ],
};

const countdownFields: Field[] = [
  { kind: "date", key: "target_date", label: "Tanggal target" },
  { kind: "text", key: "message_expired", label: "Pesan setelah lewat" },
];

const giftFields: Field[] = [
  { kind: "textarea", key: "intro", label: "Kalimat pembuka" },
  {
    kind: "array",
    key: "bank_accounts",
    label: "Rekening / e-wallet",
    addLabel: "Tambah rekening",
    itemLabel: "Rekening",
    defaultItem: { bank_name: "", account_number: "", account_name: "" },
    itemFields: [
      { kind: "text", key: "bank_name", label: "Bank / e-wallet" },
      { kind: "text", key: "account_number", label: "Nomor rekening" },
      { kind: "text", key: "account_name", label: "Atas nama" },
    ],
  },
];

/* ---- shared style options ---- */
const sOverlay: StyleOption = {
  key: "overlay",
  label: "Kegelapan foto",
  default: "medium",
  options: [
    { value: "light", label: "Terang" },
    { value: "medium", label: "Sedang" },
    { value: "dark", label: "Gelap" },
  ],
};
const sTextPos: StyleOption = {
  key: "text_pos",
  label: "Posisi teks",
  default: "center",
  options: [
    { value: "top", label: "Atas" },
    { value: "center", label: "Tengah" },
    { value: "bottom", label: "Bawah" },
  ],
};
const sPhotoShape: StyleOption = {
  key: "photo_shape",
  label: "Bentuk foto",
  default: "circle",
  options: [
    { value: "circle", label: "Bulat" },
    { value: "rounded", label: "Kotak lembut" },
    { value: "arch", label: "Melengkung" },
  ],
};

export const SectionRegistry: Record<string, SectionDefinition> = {
  hero: {
    type: "hero",
    name: "Sampul / Pembuka",
    description: "Bagian pertama yang dilihat tamu",
    icon: "Sparkles",
    category: "hero",
    variants: {
      centered: {
        name: "Foto Fullscreen",
        description: "Foto memenuhi layar, teks di atasnya",
        component: HeroCentered,
        propsSchema: HeroProps,
        fields: [...heroBase, { kind: "image", key: "background_image", label: "Foto latar" }],
        styleOptions: [sOverlay, sTextPos],
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
          has_countdown: true,
        },
      },
      split: {
        name: "Split + Teks",
        description: "Foto di satu sisi, teks di sisi lain",
        component: HeroSplit,
        propsSchema: HeroProps,
        fields: [...heroBase, { kind: "image", key: "background_image", label: "Foto" }],
        styleOptions: [
          {
            key: "photo_side",
            label: "Sisi foto",
            default: "left",
            options: [
              { value: "left", label: "Kiri" },
              { value: "right", label: "Kanan" },
            ],
          },
        ],
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
        },
      },
      minimal: {
        name: "Minimalis (tanpa foto)",
        description: "Tipografi besar, elegan, tanpa gambar",
        component: HeroMinimal,
        propsSchema: HeroProps,
        fields: heroBase,
        styleOptions: [
          {
            key: "scale",
            label: "Ukuran nama",
            default: "xl",
            options: [
              { value: "lg", label: "Besar" },
              { value: "xl", label: "Sangat besar" },
            ],
          },
        ],
        defaultProps: {
          couple_names: "Dinda & Raka",
          tagline: "The Wedding Of",
          event_date: nowPlus(45),
        },
      },
      arch: {
        name: "Foto Melengkung + Ornamen",
        description: "Foto arch dengan bingkai sudut",
        component: HeroArch,
        propsSchema: HeroProps,
        fields: [
          ...heroBase,
          { kind: "image", key: "background_image", label: "Foto" },
        ],
        styleOptions: [
          {
            key: "frame",
            label: "Bingkai",
            default: "ornament",
            options: [
              { value: "ornament", label: "Ornamen sudut" },
              { value: "plain", label: "Polos" },
            ],
          },
        ],
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
    variants: {
      "side-by-side": {
        name: "Bersebelahan",
        description: "Dua foto sejajar",
        component: CoupleSideBySide,
        propsSchema: CoupleIntroProps,
        fields: coupleFields,
        styleOptions: [sPhotoShape],
        defaultProps: {
          bride: { name: "Dinda", full_name: "Dinda Ayu Pratiwi", child_order: "Putri kedua dari" },
          groom: { name: "Raka", full_name: "Raka Wibowo", child_order: "Putra pertama dari" },
        },
      },
      stacked: {
        name: "Bertumpuk",
        description: "Satu di atas yang lain, dipisah '&'",
        component: CoupleStacked,
        propsSchema: CoupleIntroProps,
        fields: coupleFields,
        styleOptions: [sPhotoShape],
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
        fields: coupleFields,
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
    variants: {
      timeline: {
        name: "Timeline",
        description: "Daftar vertikal berurutan",
        component: EventTimeline,
        propsSchema: EventDetailsProps,
        fields: [eventsArray],
        defaultProps: {
          events: [
            { name: "Akad Nikah", date: nowPlus(45), start_time: "08:00", end_time: "10:00", venue_name: "Masjid Al-Falah", address: "Jl. Melati No. 10, Bandung" },
            { name: "Resepsi", date: nowPlus(45), start_time: "11:00", end_time: "14:00", venue_name: "Gedung Serbaguna", address: "Jl. Melati No. 12, Bandung" },
          ],
        },
      },
      cards: {
        name: "Kartu Berdampingan",
        description: "Dua kartu acara sejajar",
        component: EventCards,
        propsSchema: EventDetailsProps,
        fields: [eventsArray],
        defaultProps: {
          events: [
            { name: "Akad Nikah", date: nowPlus(45), start_time: "08:00", venue_name: "Masjid Al-Falah" },
            { name: "Resepsi", date: nowPlus(45), start_time: "11:00", venue_name: "Gedung Serbaguna" },
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
    variants: {
      minimal: {
        name: "Kotak Minimalis",
        component: CountdownMinimal,
        propsSchema: CountdownProps,
        fields: countdownFields,
        defaultProps: { target_date: nowPlus(45) },
      },
      flip: {
        name: "Flip Clock",
        description: "Kartu gelap bergaya jam flip",
        component: CountdownFlip,
        propsSchema: CountdownProps,
        fields: countdownFields,
        defaultProps: { target_date: nowPlus(45) },
      },
      rings: {
        name: "Cincin Progres",
        description: "Lingkaran progres berwarna",
        component: CountdownRings,
        propsSchema: CountdownProps,
        fields: countdownFields,
        defaultProps: { target_date: nowPlus(45) },
      },
      pill: {
        name: "Satu Baris",
        description: "Ringkas dalam satu pill",
        component: CountdownPill,
        propsSchema: CountdownProps,
        fields: countdownFields,
        defaultProps: { target_date: nowPlus(45) },
      },
      elegant: {
        name: "Serif Elegan",
        description: "Angka serif besar",
        component: CountdownElegant,
        propsSchema: CountdownProps,
        fields: countdownFields,
        styleOptions: [
          {
            key: "sep",
            label: "Pemisah",
            default: "dot",
            options: [
              { value: "dot", label: "Titik" },
              { value: "none", label: "Tanpa" },
            ],
          },
        ],
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
    variants: {
      grid: {
        name: "Grid Rapi",
        component: GalleryGrid,
        propsSchema: GalleryProps,
        fields: [columnsField, imagesArray],
        styleOptions: [
          {
            key: "gap",
            label: "Jarak antar foto",
            default: "tight",
            options: [
              { value: "tight", label: "Rapat" },
              { value: "loose", label: "Renggang" },
            ],
          },
          {
            key: "radius",
            label: "Sudut foto",
            default: "soft",
            options: [
              { value: "sharp", label: "Tajam" },
              { value: "soft", label: "Lembut" },
            ],
          },
        ],
        defaultProps: { images: [], columns: 3 },
      },
      masonry: {
        name: "Masonry",
        description: "Tinggi foto bervariasi",
        component: GalleryMasonry,
        propsSchema: GalleryProps,
        fields: [columnsField, imagesArray],
        defaultProps: { images: [], columns: 3 },
      },
      carousel: {
        name: "Carousel Geser",
        description: "Geser horizontal dengan snap",
        component: GalleryCarousel,
        propsSchema: GalleryProps,
        fields: [imagesArray],
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
    variants: {
      centered: {
        name: "Tengah",
        component: QuoteCentered,
        propsSchema: QuoteProps,
        fields: [
          { kind: "textarea", key: "text", label: "Teks kutipan" },
          { kind: "text", key: "source", label: "Sumber" },
        ],
        defaultProps: {
          text: "Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri.",
          source: "QS. Ar-Rum: 21",
        },
      },
      bordered: {
        name: "Garis Ornamen",
        description: "Dengan garis rambut atas–bawah",
        component: QuoteBordered,
        propsSchema: QuoteProps,
        fields: [
          { kind: "textarea", key: "text", label: "Teks kutipan" },
          { kind: "text", key: "source", label: "Sumber" },
        ],
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
    variants: {
      "form-card": {
        name: "Form Card",
        component: RsvpFormCard,
        propsSchema: RsvpProps,
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
    },
  },

  "map-location": {
    type: "map-location",
    name: "Peta Lokasi",
    description: "Peta atau tombol ke Google Maps",
    icon: "MapPin",
    category: "content",
    variants: {
      embed: {
        name: "Peta Tersemat",
        description: "Iframe Google Maps",
        component: MapEmbed,
        propsSchema: MapProps,
        fields: [
          { kind: "text", key: "venue_name", label: "Nama tempat" },
          { kind: "textarea", key: "address", label: "Alamat" },
          {
            kind: "url",
            key: "embed_url",
            label: "URL embed",
            help: "Maps → Bagikan → Sematkan peta → salin src",
          },
        ],
        defaultProps: { venue_name: "Gedung Serbaguna", address: "Jl. Melati No. 12, Bandung" },
      },
      button: {
        name: "Tombol Maps",
        description: "Tombol buka Google Maps",
        component: MapButton,
        propsSchema: MapProps,
        fields: [
          { kind: "text", key: "venue_name", label: "Nama tempat" },
          { kind: "textarea", key: "address", label: "Alamat" },
          { kind: "url", key: "maps_url", label: "Link Google Maps" },
        ],
        defaultProps: { venue_name: "Gedung Serbaguna", address: "Jl. Melati No. 12, Bandung" },
      },
    },
  },

  closing: {
    type: "closing",
    name: "Penutup / Terima Kasih",
    description: "Ucapan penutup dari mempelai",
    icon: "Heart",
    category: "footer",
    variants: {
      simple: {
        name: "Teks Sederhana",
        component: ClosingSimple,
        propsSchema: ClosingProps,
        fields: [
          { kind: "textarea", key: "message", label: "Pesan penutup" },
          { kind: "text", key: "names", label: "Nama" },
        ],
        defaultProps: { names: "Dinda & Raka" },
      },
      photo: {
        name: "Dengan Foto",
        component: ClosingPhoto,
        propsSchema: ClosingProps,
        fields: [
          { kind: "textarea", key: "message", label: "Pesan penutup" },
          { kind: "text", key: "names", label: "Nama" },
          { kind: "image", key: "photo", label: "Foto latar" },
        ],
        defaultProps: { names: "Dinda & Raka" },
      },
    },
  },

  gift: {
    type: "gift",
    name: "Amplop Digital",
    description: "Rekening & e-wallet hadiah",
    icon: "Gift",
    category: "content",
    variants: {
      cards: {
        name: "Kartu Bank",
        component: GiftCards,
        propsSchema: GiftProps,
        fields: giftFields,
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
        fields: giftFields,
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

/** default props termasuk nilai styleOptions. */
export function variantDefaultProps(type: string, variantKey: string) {
  const v = getVariant(type, variantKey);
  if (!v) return {};
  const base = structuredClone(v.defaultProps);
  for (const so of v.styleOptions ?? []) {
    base[`s_${so.key}`] = so.default;
  }
  return base;
}
