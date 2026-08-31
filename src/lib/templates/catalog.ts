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

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

export const TEMPLATES: TemplatePreset[] = [
  {
    id: "sage-emas-klasik",
    name: "Sage Emas Klasik",
    description:
      "Nama tulisan tangan emas di atas hijau sage lembut, hiasan dedaunan di sudut, dan kartu putih bersih — hangat dan klasik.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/sage-emas-klasik/card",
    global_settings: {
      font_family: "Parisienne",
      color_primary: "#c48b39",
      color_secondary: "#90a77c",
      color_background: "#f4f6f2",
      animation: "zoom",
    },
    sections: [
      s("cover", "botanical", 0, {
        names: "Firda & Wildan",
        tagline: "The Wedding Of",
        note: "Kepada Yth. Bapak/Ibu/Saudara/i",
        button_label: "Buka Undangan",
      }),
      s("hero", "botanical", 1, {
        couple_names: "Firda & Wildan",
        tagline: "The Wedding Of",
        event_date: inDays(45),
        s_palette: "cream",
      }),
      s("couple-intro", "stacked", 2, {
        bride: {
          name: "Firda",
          full_name: "Firdausil Jannah",
          child_order: "Putri bungsu dari",
          parents: "Bapak Much Arifin & Ibu Nurul Hidayati",
          instagram: "firda.u.j",
        },
        groom: {
          name: "Wildan",
          full_name: "Wildan Almubarok",
          child_order: "Putra pertama dari",
          parents: "Bapak Syamsun & Ibu Muhibbatul Azizah",
          instagram: "wildan._.al",
        },
        s_photo_shape: "circle",
      }),
      s("quote", "bordered", 3, {
        text: "Dan di antara tanda-tanda kekuasaan-Nya ialah diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya, dan dijadikan-Nya rasa kasih dan sayang di antara kamu.",
        source: "Q.S. Ar-Rum: 21",
      }),
      s("countdown", "rings", 4, {}),
      s("event-details", "timeline", 5, {
        events: [
          {
            name: "Akad & Resepsi Nikah",
            date: inDays(45),
            start_time: "09:00",
            end_time: "selesai",
            venue_name: "Kediaman Mempelai Wanita",
            address: "RT 02 RW 05 Pojkecik, Baujeng, Pasuruan",
          },
        ],
      }),
      s("map-location", "embed", 6, {}),
      s("gallery", "carousel", 7, { images: [] }),
      s("rsvp", "form-card", 8, {}),
      s("guestbook", "cards", 9, {}),
      s("gift", "minimal", 10, {}),
      s("closing", "simple", 11, {
        names: "Firda & Wildan",
        message:
          "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.",
      }),
      s("music", "disc", 12, {}),
      s("navigation", "bar", 13, {}),
    ],
  },
  {
    id: "kana-noir",
    name: "Elegan Hijau Emas",
    description: "Hijau tua mewah dengan aksen emas — kesan berkelas untuk resepsi malam.",
    category: "wedding",
    tier: "premium",
    thumbnail: "/templates/kana-noir/card",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#243b30",
      color_secondary: "#c6a15b",
      color_background: "#0f1512",
      animation: "fade-up",
    },
    sections: [
      s("cover", "botanical", 0, { names: "Kana & Arya", tagline: "The Wedding Of", s_palette: "noir" }),
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
      s("music", "disc", 11, {}),
      s("navigation", "bar", 12, {}),
    ],
  },
  {
    id: "kana-botanical",
    name: "Sage Bunga Lembut",
    description: "Hijau sage kalem dengan hiasan bunga — manis dan natural.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/kana-botanical/card",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#5c6f52",
      color_secondary: "#a4715a",
      color_background: "#f6f4ee",
      animation: "fade-up",
    },
    sections: [
      s("cover", "botanical", 0, { names: "Kana & Arya", tagline: "The Wedding Of" }),
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
      s("music", "disc", 11, {}),
      s("navigation", "bar", 12, {}),
    ],
  },
  {
    id: "elegant-forest",
    name: "Hijau Klasik",
    description: "Hijau daun yang tenang — cocok untuk akad & resepsi outdoor.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/elegant-forest/card",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#34503f",
      color_secondary: "#7a2e3c",
      color_background: "#fbf8f3",
      animation: "fade-up",
    },
    sections: [
      s("cover", "classic", 0, { names: "Dinda & Raka" }),
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
    name: "Islami Maroon",
    description: "Nuansa maroon klasik dengan sentuhan islami yang khidmat.",
    category: "wedding",
    tier: "free",
    thumbnail: "/templates/islamic-classic/card",
    global_settings: {
      font_family: "Fraunces",
      color_primary: "#7a2e3c",
      color_secondary: "#b08a4f",
      color_background: "#faf6f0",
      animation: "fade-up",
    },
    sections: [
      s("cover", "classic", 0, { names: "Fatimah & Umar", tagline: "بسم الله" }),
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
    name: "Khitan Ceria",
    description: "Warna cerah dan riang untuk syukuran khitan anak.",
    category: "khitan",
    tier: "free",
    thumbnail: "/templates/khitan-joy/card",
    global_settings: {
      font_family: "Inter",
      color_primary: "#2b6cb0",
      color_secondary: "#dd6b20",
      color_background: "#f7fafc",
      animation: "fade-left",
    },
    sections: [
      s("cover", "photo", 0, { names: "Khitan Arkan", tagline: "Syukuran Khitan" }),
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
