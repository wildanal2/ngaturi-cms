import type { GlobalSettings, SectionData } from "@/sections/types";

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: "wedding" | "khitan" | "tahlil" | "aqiqah" | "engagement" | "generic";
  tier: "free" | "basic" | "premium";
  thumbnail: string;
  global_settings: GlobalSettings;
  sections: Omit<SectionData, "id">[];
}

const s = (
  type: string,
  variant: string,
  order: number,
  props: Record<string, unknown> = {},
): Omit<SectionData, "id"> => ({ type, variant, order, visible: true, props });

export const TEMPLATES: TemplatePreset[] = [
  {
    id: "kana-noir",
    name: "Kana Noir",
    description: "Hijau gelap mewah, aksen emas, ornamen eucalyptus.",
    category: "wedding",
    tier: "premium",
    thumbnail: "/templates/kana-noir.svg",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#243b30",
      color_secondary: "#c6a15b",
      color_background: "#0f1512",
      animation: "fade-up",
    },
    sections: [
      s("hero", "botanical", 0, {
        couple_names: "Kana & Arya",
        tagline: "The Wedding Of",
        event_date: new Date(Date.now() + 55 * 86400000).toISOString(),
        s_palette: "noir",
      }),
      s("quote", "bordered", 1, {
        text: "Semoga Allah menyatukan yang berserak dan memberkahi keduanya.",
        source: "Doa pernikahan",
      }),
      s("couple-intro", "stacked", 2, {
        bride: { name: "Kana", full_name: "Kana Maheswari", child_order: "Putri pertama" },
        groom: { name: "Arya", full_name: "Arya Danendra", child_order: "Putra kedua" },
        s_photo_shape: "arch",
      }),
      s("countdown", "elegant", 3, { s_sep: "dot" }),
      s("event-details", "cards", 4, {}),
      s("map-location", "embed", 5, {}),
      s("gallery", "carousel", 6, { images: [] }),
      s("rsvp", "form-card", 7, {}),
      s("guestbook", "cards", 8, {}),
      s("gift", "minimal", 9, {}),
      s("closing", "photo", 10, { names: "Kana & Arya" }),
      s("music", "floating", 11, {}),
      s("navigation", "bar", 12, {}),
    ],
  },
  {
    id: "kana-botanical",
    name: "Kana Botanical",
    description: "Sage lembut dengan ornamen bunga & navigasi bawah.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/kana-botanical.svg",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#5c6f52",
      color_secondary: "#a4715a",
      color_background: "#f6f4ee",
      animation: "fade-up",
    },
    sections: [
      s("hero", "botanical", 0, {
        couple_names: "Kana & Arya",
        tagline: "The Wedding Of",
        event_date: new Date(Date.now() + 50 * 86400000).toISOString(),
      }),
      s("quote", "bordered", 1, {
        text: "Semoga Allah menyatukan yang berserak dan memberkahi keduanya.",
        source: "Doa pernikahan",
      }),
      s("couple-intro", "stacked", 2, {
        bride: { name: "Kana", full_name: "Kana Maheswari", child_order: "Putri pertama" },
        groom: { name: "Arya", full_name: "Arya Danendra", child_order: "Putra kedua" },
      }),
      s("countdown", "elegant", 3, {}),
      s("event-details", "cards", 4, {}),
      s("map-location", "embed", 5, {}),
      s("gallery", "carousel", 6, { images: [] }),
      s("rsvp", "form-card", 7, {}),
      s("guestbook", "cards", 8, {}),
      s("gift", "minimal", 9, {}),
      s("closing", "simple", 10, { names: "Kana & Arya" }),
      s("music", "floating", 11, {}),
      s("navigation", "bar", 12, {}),
    ],
  },
  {
    id: "elegant-forest",
    name: "Elegant Forest",
    description: "Hijau daun yang tenang, cocok untuk pernikahan outdoor.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/elegant-forest.svg",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#34503f",
      color_secondary: "#7a2e3c",
      color_background: "#fbf8f3",
      animation: "fade-up",
    },
    sections: [
      s("hero", "centered", 0, {
        couple_names: "Dinda & Raka",
        tagline: "The Wedding Of",
        overlay_opacity: 0.45,
      }),
      s("quote", "centered", 1, {
        text: "Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri.",
        source: "QS. Ar-Rum: 21",
      }),
      s("couple-intro", "side-by-side", 2, {
        bride: { name: "Dinda", full_name: "Dinda Ayu Pratiwi", child_order: "Putri kedua dari Bpk. Ahmad & Ibu Sri" },
        groom: { name: "Raka", full_name: "Raka Wibowo", child_order: "Putra pertama dari Bpk. Joko & Ibu Rina" },
      }),
      s("countdown", "minimal", 3, {}),
      s("event-details", "timeline", 4, {}),
      s("gallery", "grid", 5, { images: [], columns: 3 }),
      s("rsvp", "form-card", 6, { max_guests_per_person: 2 }),
      s("guestbook", "cards", 7, { require_approval: true }),
      s("gift", "cards", 8, {}),
    ],
  },
  {
    id: "islamic-classic",
    name: "Islamic Classic",
    description: "Nuansa maroon klasik dengan ornamen sederhana.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/islamic-classic.svg",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#7a2e3c",
      color_secondary: "#b08a4f",
      color_background: "#faf6f0",
      animation: "fade-up",
    },
    sections: [
      s("hero", "split", 0, { couple_names: "Fatimah & Umar", tagline: "بسم الله" }),
      s("quote", "centered", 1, {
        text: "Semoga Allah memberkahi kalian, dan menyatukan kalian berdua dalam kebaikan.",
        source: "HR. Abu Dawud",
      }),
      s("couple-intro", "stacked", 2, {
        bride: { name: "Fatimah", full_name: "Fatimah Az-Zahra" },
        groom: { name: "Umar", full_name: "Umar Faruq" },
      }),
      s("countdown", "minimal", 3, {}),
      s("event-details", "timeline", 4, {}),
      s("rsvp", "form-card", 5, { require_phone: true }),
      s("guestbook", "cards", 6, {}),
    ],
  },
  {
    id: "khitan-joy",
    name: "Khitan Joy",
    description: "Cerah dan ceria untuk syukuran khitan.",
    category: "khitan",
    tier: "free",
    thumbnail: "/templates/khitan-joy.svg",
    global_settings: {
      font_family: "Inter",
      color_primary: "#2b6cb0",
      color_secondary: "#dd6b20",
      color_background: "#f7fafc",
      animation: "fade-left",
    },
    sections: [
      s("hero", "centered", 0, {
        couple_names: "Khitan Arkan",
        tagline: "Syukuran Khitan",
        overlay_opacity: 0.4,
      }),
      s("event-details", "timeline", 1, {
        events: [
          {
            name: "Syukuran",
            date: new Date(Date.now() + 30 * 86400000).toISOString(),
            start_time: "09:00",
            end_time: "13:00",
            venue_name: "Kediaman Keluarga",
            address: "Jl. Kenanga No. 5",
          },
        ],
      }),
      s("countdown", "minimal", 2, {}),
      s("rsvp", "form-card", 3, {}),
      s("guestbook", "cards", 4, {}),
    ],
  },
];

export function getTemplate(id: string): TemplatePreset | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
