/**
 * Shared field descriptors, style options and dummy-data helpers used by the
 * per-section `index.ts` files. Each section folder builds its own
 * SectionDefinition; anything reused across sections lives here.
 */
import type { Field, StyleOption } from "./types";

export const nowPlus = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

/* ---- hero / couple ---- */

export const heroBase: Field[] = [
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
    { kind: "text", key: `${prefix}.residence`, label: "Kota / daerah asal" },
    { kind: "text", key: `${prefix}.instagram`, label: "Instagram (tanpa @)" },
    { kind: "image", key: `${prefix}.photo`, label: "Foto" },
  ],
});
export const coupleFields: Field[] = [person("bride"), person("groom")];

/* ---- events / gallery ---- */

export const eventsArray: Field = {
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

export const imagesArray: Field = {
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

export const columnsField: Field = {
  kind: "select",
  key: "columns",
  label: "Jumlah kolom",
  options: [
    { value: "2", label: "2 kolom" },
    { value: "3", label: "3 kolom" },
    { value: "4", label: "4 kolom" },
  ],
};

/* ---- countdown / gift ---- */

export const countdownFields: Field[] = [
  { kind: "date", key: "target_date", label: "Tanggal target" },
  { kind: "text", key: "message_expired", label: "Pesan setelah lewat" },
];

export const giftFields: Field[] = [
  { kind: "textarea", key: "intro", label: "Kalimat pembuka" },
  {
    kind: "array",
    key: "bank_accounts",
    label: "Rekening / e-wallet",
    addLabel: "Tambah rekening",
    itemLabel: "Rekening",
    defaultItem: { bank_name: "", account_number: "", account_name: "", logo_url: "" },
    itemFields: [
      { kind: "text", key: "bank_name", label: "Bank / e-wallet" },
      { kind: "text", key: "account_number", label: "Nomor rekening" },
      { kind: "text", key: "account_name", label: "Atas nama" },
      { kind: "image", key: "logo_url", label: "Logo (opsional)" },
    ],
  },
];

/* ---- shared style options ---- */

export const sOverlay: StyleOption = {
  key: "overlay",
  label: "Kegelapan foto",
  default: "medium",
  options: [
    { value: "light", label: "Terang" },
    { value: "medium", label: "Sedang" },
    { value: "dark", label: "Gelap" },
  ],
};
export const sTextPos: StyleOption = {
  key: "text_pos",
  label: "Posisi teks",
  default: "center",
  options: [
    { value: "top", label: "Atas" },
    { value: "center", label: "Tengah" },
    { value: "bottom", label: "Bawah" },
  ],
};
export const sPhotoShape: StyleOption = {
  key: "photo_shape",
  label: "Bentuk foto",
  default: "circle",
  options: [
    { value: "circle", label: "Bulat" },
    { value: "rounded", label: "Kotak lembut" },
    { value: "arch", label: "Melengkung" },
  ],
};

/* ---- music ---- */

export const musicPickerField: Field = { kind: "music-picker", label: "Lagu" };
export const sMusicPosition: StyleOption = {
  key: "position",
  label: "Posisi tombol",
  default: "right",
  options: [
    { value: "right", label: "Kanan bawah" },
    { value: "left", label: "Kiri bawah" },
  ],
};

/* ---- cover ---- */

export const coverFields: Field[] = [
  { kind: "text", key: "names", label: "Nama (mis. Dinda & Raka)" },
  { kind: "text", key: "tagline", label: "Teks atas" },
  { kind: "text", key: "note", label: "Kalimat sebelum nama tamu" },
  { kind: "text", key: "button_label", label: "Teks tombol" },
];
export const coverPhotoField: Field = {
  kind: "image",
  key: "background_image",
  label: "Foto sampul",
};
export const sCoverOverlay: StyleOption = {
  key: "overlay",
  label: "Kegelapan foto",
  default: "medium",
  options: [
    { value: "light", label: "Terang" },
    { value: "medium", label: "Sedang" },
    { value: "dark", label: "Gelap" },
  ],
};
export const coverDefaults = {
  names: "Dinda & Raka",
  tagline: "The Wedding Of",
  note: "Kepada Bapak/Ibu/Saudara/i",
  button_label: "Buka Undangan",
};

/* ---- dummy data (public placeholders) ---- */

// contoh lokasi publik (Monas, Jakarta) — ganti dengan lokasi acara
export const DUMMY_MAP_EMBED =
  "https://maps.google.com/maps?q=-6.175392,106.827153&z=15&output=embed";
export const DUMMY_MAP_LINK =
  "https://www.google.com/maps/search/?api=1&query=-6.175392,106.827153";

// logo bank (SVG, currentColor / berwarna) — DiceBear icon set bebas pakai
export const bankLogo = (seed: string) =>
  `https://api.dicebear.com/9.x/icons/svg?icon=bank&seed=${seed}&backgroundType=gradientLinear`;
