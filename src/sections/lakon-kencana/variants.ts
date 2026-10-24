import { z } from "zod";
import { createElement } from "react";
import type { VariantDefinition, Field } from "../types";
import {
  CoverProps,
  HeroProps,
  CoupleIntroProps,
  StoryProps,
  EventDetailsProps,
  MapProps,
  CountdownProps,
  GalleryProps,
  QuoteProps,
  RsvpProps,
  GuestbookProps,
  GiftProps,
  ClosingProps,
  MusicProps2,
  NavigationProps,
} from "../schema";
import {
  coverFields,
  heroBase,
  coupleFields,
  eventsArray,
  imagesArray,
  giftFields,
  countdownFields,
  musicPickerField,
} from "../fields";
import { LAKON_ASSETS } from "./data";

// Metadata stays usable on the server; lazy rendering belongs to a client boundary.
import {
  LoadingLakon,
  CoverLakon,
  HeroLakon,
  CoupleLakon,
  QuoteLakon,
  StoryLakon,
  EventsLakon,
  MapLakon,
  CountdownLakon,
  ClosingLakon,
  GalleryLakon,
  RsvpLakon,
  GuestbookLakon,
  GiftLakon,
  MusicLakon,
  NavigationLakon,
} from "./renderers";

const extra = {
  title: z.string().optional(),
  eyebrow: z.string().optional(),
  intro: z.string().optional(),
};
const headingFields: Field[] = [
  { kind: "text", key: "title", label: "Judul bagian" },
  { kind: "text", key: "eyebrow", label: "Label kecil" },
  { kind: "textarea", key: "intro", label: "Kalimat pengantar (opsional)" },
];
const date = "2027-06-19T08:00:00+07:00";
const dateHelp =
  "Acara aktif pertama menjadi sumber tanggal utama. Field ini dipakai bila tidak ada acara bertanggal.";
const galleryField = imagesArray as Extract<Field, { kind: "array" }>;
const variant = (
  definition: Omit<VariantDefinition, "name" | "isPremium">,
): VariantDefinition => ({
  name: "Lakon Kencana",
  isPremium: true,
  ...definition,
  // SectionRegistry retains its callable component contract in tests and renderers.
  component: (props) => createElement(definition.component, props),
});

export const lakonVariants: Record<string, VariantDefinition> = {
  loading: variant({
    component: LoadingLakon,
    propsSchema: z.object({ message: z.string() }),
    fields: [{ kind: "text", key: "message", label: "Pesan persiapan" }],
    defaultProps: { message: "Mempersiapkan pahargyan…" },
  }),
  cover: variant({
    component: CoverLakon,
    propsSchema: CoverProps.extend({
      recipient_fallback: z.string().optional(),
      gesture_label: z.string().optional(),
    }),
    fields: [
      ...coverFields,
      {
        kind: "text",
        key: "recipient_fallback",
        label: "Sapaan jika nama tamu kosong",
      },
      { kind: "text", key: "gesture_label", label: "Petunjuk membuka" },
    ],
    defaultProps: {
      names: "Bagas & Sekar",
      tagline: "Pahargyan Pawiwahan",
      note: "Kepada Yth. Bapak/Ibu/Saudara/i",
      recipient_fallback: "Tamu Undangan",
      button_label: "Buka Undangan",
      gesture_label: "atau geser gunungan ke atas",
    },
  }),
  hero: variant({
    component: HeroLakon,
    propsSchema: HeroProps.extend({
      subtitle: z.string().optional(),
      photo_position: z.string().optional(),
    }),
    fields: [
      ...heroBase.map((f) =>
        f.kind === "date" ? { ...f, help: dateHelp } : f,
      ),
      { kind: "text", key: "subtitle", label: "Teks sambutan kecil" },
      { kind: "image", key: "background_image", label: "Foto pasangan" },
      {
        kind: "text",
        key: "photo_position",
        label: "Titik fokus foto",
        help: "Posisi horizontal dan vertikal, misalnya 70% 40%.",
      },
    ],
    defaultProps: {
      couple_names: "Bagas & Sekar",
      tagline: "Sugeng Rawuh",
      subtitle: "DENGAN SEGENAP CINTA & DOA",
      event_date: date,
      has_countdown: false,
      background_image: `${LAKON_ASSETS}/demo-portrait.webp`,
      photo_position: "50% 35%",
    },
  }),
  "couple-intro": variant({
    component: CoupleLakon,
    propsSchema: CoupleIntroProps.extend({ intro: z.string().optional() }),
    fields: [
      ...headingFields,
      ...coupleFields,
      {
        kind: "text",
        key: "groom.name",
        label: "Nama panggilan mempelai pria",
      },
      {
        kind: "text",
        key: "bride.name",
        label: "Nama panggilan mempelai wanita",
      },
      {
        kind: "textarea",
        key: "groom.bio",
        label: "Profil mempelai pria (opsional)",
      },
      {
        kind: "textarea",
        key: "bride.bio",
        label: "Profil mempelai wanita (opsional)",
      },
    ],
    defaultProps: {
      title: "Sepasang Mempelai",
      eyebrow: "TEMANTEN",
      intro:
        "Dua hati, satu lakon. Dengan restu keluarga, kami memulai kisah yang baru.",
      groom: {
        name: "Bagas",
        full_name: "Bagas Pradipta",
        child_order: "Putra pertama dari",
        parents: "Bapak Surya & Ibu Ratih",
        photo: `${LAKON_ASSETS}/demo-portrait.webp`,
      },
      bride: {
        name: "Sekar",
        full_name: "Sekar Ayu Lestari",
        child_order: "Putri kedua dari",
        parents: "Bapak Wibawa & Ibu Laras",
        photo: `${LAKON_ASSETS}/demo-portrait.webp`,
      },
    },
  }),
  quote: variant({
    component: QuoteLakon,
    propsSchema: QuoteProps,
    fields: [
      { kind: "textarea", key: "text", label: "Kutipan / doa" },
      { kind: "text", key: "source", label: "Sumber" },
    ],
    defaultProps: {
      text: "Semoga setiap langkah menjadi tempat kasih bertumbuh, dan setiap pulang menjadi ketenteraman.",
      source: "Doa untuk mempelai",
    },
  }),
  story: variant({
    component: StoryLakon,
    propsSchema: StoryProps.extend({ intro: z.string().optional() }),
    fields: [
      ...headingFields,
      {
        kind: "array",
        key: "items",
        label: "Babak perjalanan",
        addLabel: "Tambah babak",
        itemLabel: "Babak",
        defaultItem: { year: "", title: "", description: "", image: "" },
        itemFields: [
          { kind: "text", key: "year", label: "Tahun / waktu" },
          { kind: "text", key: "title", label: "Judul" },
          { kind: "textarea", key: "description", label: "Kisah" },
          { kind: "image", key: "image", label: "Foto babak (opsional)" },
        ],
      },
    ],
    defaultProps: {
      title: "Lakon Kita",
      eyebrow: "SERAT KENANGAN",
      intro:
        "Setiap pertemuan membawa cerita. Inilah beberapa babak yang mengantarkan kami ke hari bahagia.",
      items: [
        {
          year: "2022",
          title: "Tepung",
          description:
            "Sebuah pertemuan sederhana menjadi awal percakapan yang tak kunjung usai. Dari saling menyapa, kami mulai mengenal mimpi dan hal-hal kecil yang membuat satu sama lain tersenyum.",
          image: `${LAKON_ASSETS}/demo-couple.webp`,
        },
        {
          year: "2025",
          title: "Sesarengan",
          description:
            "Di antara perjalanan dan hari-hari yang biasa, kami belajar bahwa kebersamaan bukan tentang selalu sependapat, melainkan saling mendengarkan dan memilih tumbuh bersama.",
          image: `${LAKON_ASSETS}/demo-rings.webp`,
        },
        {
          year: "2027",
          title: "Saklawase",
          description:
            "Dengan restu keluarga, kami menyambut babak baru. Terima kasih telah menjadi bagian dari cerita, doa, dan langkah yang akan kami jalani bersama.",
          image: `${LAKON_ASSETS}/demo-portrait.webp`,
        },
      ],
    },
  }),
  "event-details": variant({
    component: EventsLakon,
    propsSchema: EventDetailsProps.extend({
      title: z.string().optional(),
      eyebrow: z.string().optional(),
    }),
    fields: [...headingFields, eventsArray],
    defaultProps: {
      title: "Pahargyan",
      eyebrow: "WAKTU & TEMPAT",
      intro:
        "Dengan memohon rahmat Tuhan Yang Maha Esa, kami mengundang kehadiran Anda untuk merayakan hari bahagia kami.",
      events: [
        {
          name: "Akad Nikah",
          date,
          start_time: "08:00",
          end_time: "09:00",
          venue_name: "Pendapa Kencana",
          address: "Yogyakarta",
          maps_url: "",
        },
        {
          name: "Resepsi",
          date,
          start_time: "11:00",
          end_time: "14:00",
          venue_name: "Pendapa Kencana",
          address: "Yogyakarta",
          maps_url: "",
        },
      ],
    },
  }),
  "map-location": variant({
    component: MapLakon,
    propsSchema: MapProps.extend(extra),
    fields: [
      ...headingFields,
      { kind: "text", key: "venue_name", label: "Nama tempat" },
      { kind: "textarea", key: "address", label: "Alamat" },
      { kind: "url", key: "maps_url", label: "Tautan Google Maps" },
      {
        kind: "url",
        key: "embed_url",
        label: "URL sematan Google Maps (opsional)",
      },
    ],
    defaultProps: {
      title: "Papan Panggonan",
      eyebrow: "ARAH LOKASI",
      venue_name: "",
      address: "",
      maps_url: "",
      embed_url: "",
    },
  }),
  countdown: variant({
    component: CountdownLakon,
    propsSchema: CountdownProps.extend(extra),
    fields: [
      ...headingFields,
      ...countdownFields.map((f) =>
        f.kind === "date" ? { ...f, help: dateHelp } : f,
      ),
    ],
    defaultProps: {
      title: "Wanci Bahagia",
      eyebrow: "MENGHITUNG HARI",
      target_date: date,
      message_expired: "Hari bahagia telah tiba",
    },
  }),
  gallery: variant({
    component: GalleryLakon,
    propsSchema: GalleryProps.extend({
      ...extra,
      images: z.array(
        z.object({
          url: z.string(),
          caption: z.string().optional(),
          full_url: z.string().optional(),
        }),
      ),
    }),
    fields: [
      ...headingFields,
      {
        ...galleryField,
        itemFields: [
          ...galleryField.itemFields,
          {
            kind: "url",
            key: "full_url",
            label: "URL resolusi penuh (opsional)",
            help: "Hanya dimuat saat foto diperbesar. Kosongkan untuk memakai foto yang sama.",
          },
        ],
      },
    ],
    defaultProps: {
      title: "Simpingan Kenangan",
      eyebrow: "POTRET KEBERSAMAAN",
      intro:
        "Sebagaimana wayang di sisi kelir, kenangan ini menjadi saksi perjalanan kami.",
      columns: 3,
      images: [
        {
          url: `${LAKON_ASSETS}/demo-portrait.webp`,
          full_url: `${LAKON_ASSETS}/demo-portrait-full.webp`,
          caption: "Sepasang cerita",
        },
        {
          url: `${LAKON_ASSETS}/demo-rings.webp`,
          full_url: `${LAKON_ASSETS}/demo-rings-full.webp`,
          caption: "Sebuah janji",
        },
        {
          url: `${LAKON_ASSETS}/demo-couple.webp`,
          full_url: `${LAKON_ASSETS}/demo-couple-full.webp`,
          caption: "Menuju hari bahagia",
        },
      ],
    },
  }),
  rsvp: variant({
    component: RsvpLakon,
    propsSchema: RsvpProps.extend(extra),
    fields: [
      ...headingFields,
      { kind: "date", key: "deadline", label: "Batas konfirmasi (opsional)" },
      {
        kind: "select",
        key: "max_guests_per_person",
        label: "Maksimal tamu per konfirmasi",
        options: [1, 2, 3, 5, 10, 20].map((n) => ({
          value: String(n),
          label: String(n),
        })),
      },
      { kind: "boolean", key: "require_phone", label: "Wajib nomor WhatsApp" },
    ],
    defaultProps: {
      title: "Kersa Rawuh?",
      eyebrow: "KONFIRMASI KEHADIRAN",
      intro: "Kehadiran Anda menjadi bagian berharga dari hari bahagia kami.",
      max_guests_per_person: 2,
      require_phone: false,
    },
  }),
  guestbook: variant({
    component: GuestbookLakon,
    propsSchema: GuestbookProps.extend(extra),
    fields: headingFields,
    defaultProps: {
      title: "Pangestu",
      eyebrow: "DOA & UCAPAN",
      intro:
        "Titipkan doa dan harapan untuk perjalanan baru kami. Setiap kata akan menjadi serat kenangan.",
      require_approval: true,
    },
  }),
  gift: variant({
    component: GiftLakon,
    propsSchema: GiftProps.extend({
      title: z.string().optional(),
      eyebrow: z.string().optional(),
    }),
    fields: [
      ...headingFields.filter((f) => !("key" in f) || f.key !== "intro"),
      ...giftFields,
    ],
    defaultProps: {
      title: "Tandha Tresna",
      eyebrow: "TANDA KASIH",
      intro:
        "Doa restu Anda adalah hadiah terindah. Bagi yang ingin berbagi tanda kasih, kami menerimanya dengan penuh terima kasih.",
      bank_accounts: [],
    },
  }),
  closing: variant({
    component: ClosingLakon,
    propsSchema: ClosingProps.extend({
      title: z.string().optional(),
      eyebrow: z.string().optional(),
    }),
    fields: [
      ...headingFields.filter((f) => !("key" in f) || f.key !== "intro"),
      { kind: "textarea", key: "message", label: "Pesan penutup" },
      { kind: "text", key: "names", label: "Nama mempelai" },
      { kind: "image", key: "photo", label: "Foto penutup (opsional)" },
    ],
    defaultProps: {
      title: "Matur Nuwun",
      eyebrow: "KANTHI KATRESNAN",
      names: "Bagas & Sekar",
      message:
        "Merupakan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.\n\nSampai berjumpa di hari bahagia kami.",
    },
  }),
  music: variant({
    component: MusicLakon,
    propsSchema: MusicProps2,
    fields: [
      musicPickerField,
      {
        kind: "boolean",
        key: "autoplay",
        label: "Putar setelah undangan dibuka",
      },
    ],
    defaultProps: { audio_url: "", autoplay: true, start_at: 0 },
  }),
  navigation: variant({
    component: NavigationLakon,
    propsSchema: NavigationProps,
    fields: [],
    defaultProps: {},
  }),
};
