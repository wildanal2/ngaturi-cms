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

type ThemeAssets = {
  bg: string;
  divider: string;
  tr: string[];
  bl: string[];
  root: string;
};

const themeAssets = (root: string): ThemeAssets => ({
  root,
  bg: `/themes/${root}/bg-floating.png`,
  divider: `/themes/${root}/divider.png`,
  tr: [1, 2, 3].map((i) => `/themes/${root}/ornament-tr-${i}.png`),
  bl: [1, 2, 3].map((i) => `/themes/${root}/ornament-bl-${i}.png`),
});

const FLOATING_EMAS = themeAssets("floating-emas");
const FLOATING_TERRACOTTA = themeAssets("floating-terracotta");

const themeDecor = (theme: ThemeAssets) => ({
  background_image: theme.bg,
  divider_image: theme.divider,
  ornament_tr_images: theme.tr,
  ornament_bl_images: theme.bl,
});

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
      s("cover", "floating", 0, {
        names: "Firda & Wildan",
        tagline: "The Wedding Of",
        note: "Kepada Yth. Bapak/Ibu/Saudara/i :",
        button_label: "Buka Undangan",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        divider_image: "/themes/sage-emas-klasik/divider.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      /* undangan_1: langsung Cover → Mempelai (tanpa hero) */
      s("couple-intro", "card", 1, {
        bride: {
          name: "Firda",
          full_name: "Firdausil Jannah",
          child_order: "Putri bungsu dari",
          parents: "Bapak Much Arifin & Ibu Nurul Hidayati",
          residence: "Baujeng - Pasuruan",
          instagram: "firda.u.j",
          photo: "/themes/sage-emas-klasik/bride.jpg",
        },
        groom: {
          name: "Wildan",
          full_name: "Wildan Almubarok",
          child_order: "Putra pertama dari",
          parents: "Bapak Syamsun & Ibu Muhibbatul Azizah",
          residence: "Jogoroto - Jombang",
          instagram: "wildan._.al",
          photo: "/themes/sage-emas-klasik/groom.jpg",
        },
        section_icon: "/themes/sage-emas-klasik/icon-mempelai.svg",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        divider_image: "/themes/sage-emas-klasik/divider.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("event-details", "formal", 2, {
        intro:
          "Bukan karena bertemu lalu berjodoh, tapi karena berjodohlah maka kami dipertemukan. Kami memutuskan untuk menggapai ridho Allah dalam ibadah pernikahan.",
        events: [
          {
            name: "Akad & Resepsi Nikah",
            date: inDays(45),
            start_time: "09:00",
            end_time: "selesai",
            venue_name: "Kediaman Mempelai Wanita",
            address: "RT 02 RW 05 Pojkecik, Baujeng, Pasuruan",
            maps_url:
              "https://www.google.com/maps/search/?api=1&query=-7.626779,112.729736",
          },
        ],
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        divider_image: "/themes/sage-emas-klasik/divider.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("map-location", "embed", 3, {}),
      s("quote", "bordered", 4, {
        text: "Dan di antara tanda-tanda kekuasaan-Nya ialah diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya, dan dijadikan-Nya rasa kasih dan sayang di antara kamu.",
        source: "Q.S. Ar-Rum: 21",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("gallery", "spotlight", 5, {
        images: [],
        section_icon: "/themes/sage-emas-klasik/icon-galeri.svg",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("guestbook", "chat", 6, {
        section_icon: "/themes/sage-emas-klasik/icon-bukutamu.svg",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        divider_image: "/themes/sage-emas-klasik/divider.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("countdown", "plain", 7, {
        save_the_date_image: "/themes/sage-emas-klasik/save-the-date.gif",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("rsvp", "form-card", 8, {}),
      s("gift", "minimal", 9, {}),
      s("closing", "thankyou", 10, {
        names: "Firda & Wildan",
        message:
          "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.",
        background_image: "/themes/sage-emas-klasik/bg-floating.png",
        ornament_tr_images: [
          "/themes/sage-emas-klasik/ornament-tr-1.png",
          "/themes/sage-emas-klasik/ornament-tr-2.png",
          "/themes/sage-emas-klasik/ornament-tr-3.png",
        ],
        ornament_bl_images: [
          "/themes/sage-emas-klasik/ornament-bl-1.png",
          "/themes/sage-emas-klasik/ornament-bl-2.png",
          "/themes/sage-emas-klasik/ornament-bl-3.png",
        ],
      }),
      s("music", "disc", 11, {}),
      s("navigation", "bar", 12, {}),
    ],
  },
  {
    id: "navy-elegan",
    name: "Navy Elegan",
    description:
      "Amplop navy dengan segel lilin, tipografi serif, kisah cinta & daftar keluarga — klasik dan formal.",
    category: "wedding",
    tier: "premium",
    thumbnail: "/templates/navy-elegan/card",
    global_settings: {
      font_family: "Cormorant",
      color_primary: "#1f2937",
      color_secondary: "#7d92b8",
      color_background: "#f2f4f9",
      animation: "fade",
    },
    sections: [
      s("cover", "wax-seal", 0, {
        names: "Renaldi & Marina",
        tagline: "The Wedding Of",
        note: "Kepada Yth. Bapak/Ibu/Saudara/i",
        seal_label: "Klik segel untuk membuka",
        envelope_color: "#182742",
        accent_color: "#c8a15e",
        texture_image: "/themes/navy-elegan/texture-navy.webp",
        seal_image: "/themes/navy-elegan/wax-seal.png",
      }),
      s("hero", "garland", 1, {
        bismillah: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم",
        couple_names: "Renaldi & Marina",
        tagline: "The Wedding Of",
        event_date: inDays(60),
        background_image: "/themes/navy-elegan/bg-watercolor.webp",
        couple_image: "/themes/navy-elegan/couple-illustration.webp",
        garland_left_image: "/themes/navy-elegan/garland-top-left.webp",
        garland_right_image: "/themes/navy-elegan/garland-top-right.webp",
        flower_left_image: "/themes/navy-elegan/flower-column-left.webp",
        flower_right_image: "/themes/navy-elegan/flower-column-right.webp",
      }),
      s("quote", "bordered", 2, {
        text: "Dan di antara tanda-tanda kekuasaan-Nya, Dia menciptakan pasangan hidup untukmu dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.",
        source: "Q.S. Ar-Rum: 21",
      }),
      s("couple-intro", "duo-portrait", 3, {
        eyebrow: "The Bride & Groom",
        title: "Calon Mempelai",
        background_image: "/themes/navy-elegan/bg-watercolor.webp",
        divider_image: "/themes/navy-elegan/couple-illustration.webp",
        flower_left_image: "/themes/navy-elegan/flower-column-left.webp",
        flower_right_image: "/themes/navy-elegan/flower-column-right.webp",
        s_photo_shape: "arch",
        s_ornament: "corners",
        bride: {
          name: "Marina",
          full_name: "Khansa Putri Maharani, S.Kom.",
          child_order: "Putri dari",
          parents: "Bapak Ahmad & Ibu Siti",
          instagram: "khansa",
          photo: "/themes/navy-elegan/bride-illustration.webp",
        },
        groom: {
          name: "Renaldi",
          full_name: "Muhammad Setiawan Hidayat, S.T.",
          child_order: "Putra dari",
          parents: "Bapak Budi & Ibu Rina",
          instagram: "setiawan",
          photo: "/themes/navy-elegan/groom-illustration.webp",
        },
      }),
      s("story", "timeline", 4, {
        items: [
          {
            year: "2020",
            title: "Pertemuan Pertama",
            description: "Kami pertama bertemu di kampus, tak menyangka akan sejauh ini.",
            image: "/themes/navy-elegan/story-2020.jpg",
          },
          {
            year: "2022",
            title: "Menjalin Komitmen",
            description: "Kami memutuskan untuk menjalani hubungan yang lebih serius.",
            image: "/themes/navy-elegan/gallery-1.jpg",
          },
          {
            year: "2025",
            title: "Lamaran",
            description: "Acara lamaran sederhana bersama kedua keluarga.",
            image: "/themes/navy-elegan/couple-illustration.webp",
          },
        ],
      }),
      s("event-details", "formal", 5, {
        intro:
          "Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan acara pernikahan putra-putri kami.",
        events: [
          {
            name: "Akad Nikah",
            date: inDays(60),
            start_time: "08:00",
            end_time: "10:00",
            venue_name: "Masjid Al-Falah",
            address: "Jl. Mawar No. 12, Jakarta Selatan",
            maps_url:
              "https://www.google.com/maps/search/?api=1&query=-6.261493,106.810600",
          },
          {
            name: "Resepsi",
            date: inDays(60),
            start_time: "11:00",
            end_time: "14:00",
            venue_name: "Ballroom Hotel Mulia, Senayan",
            address: "Jl. Asia Afrika No. 8, Jakarta Pusat",
          },
        ],
      }),
      s("family", "invited", 6, {}),
      s("family", "party", 7, {}),
      s("gallery", "spotlight", 8, {
        images: [
          { url: "/themes/navy-elegan/story-2020.jpg", caption: "Awal perjalanan kami" },
          { url: "/themes/navy-elegan/gallery-1.jpg", caption: "Momen kebersamaan" },
          { url: "/themes/navy-elegan/couple-illustration.webp", caption: "Menuju hari bahagia" },
        ],
      }),
      s("countdown", "rings", 9, {}),
      s("gift", "minimal", 10, {
        intro:
          "Doa restu Anda merupakan karunia yang sangat berarti. Namun jika memberi lebih, dapat melalui:",
      }),
      s("rsvp", "form-card", 11, {}),
      s("guestbook", "chat", 12, {}),
      s("closing", "thankyou", 13, {
        names: "Renaldi & Marina",
        message:
          "Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu.",
      }),
      s("music", "disc", 14, {}),
      s("navigation", "dock", 15, {}),
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
    id: "floating-emas",
    name: "Floating Emas",
    description:
      "Alcohol-ink hijau lembut bergaris emas, buket rose krem melayang di sudut, kartu putih membulat — mewah tapi tenang.",
    category: "wedding",
    tier: "premium",
    thumbnail: "/templates/floating-emas/card",
    global_settings: {
      font_family: "Parisienne",
      color_primary: "#c18836",
      color_secondary: "#7f7d5e",
      color_background: "#f0f4ed",
      animation: "fade-up",
    },
    sections: [
      s("cover", "floating", 0, {
        names: "Naura & Fajar",
        tagline: "The Wedding Of",
        note: "Kepada Yth. Bapak/Ibu/Saudara/i :",
        button_label: "Buka Undangan",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("quote", "bordered", 1, {
        text: "Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu mengingat kebesaran Allah.",
        source: "Q.S. Az-Zariyat: 49",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("couple-intro", "card", 2, {
        bride: {
          name: "Naura",
          full_name: "Naura Salsabila",
          child_order: "Putri kedua dari",
          parents: "Bapak H. Rustam Hamdi & Ibu Hj. Masrukiyah",
          residence: "Bogor - Jawa Barat",
          instagram: "naura.slsbl",
          photo: "/themes/floating-emas/bride.png",
        },
        groom: {
          name: "Fajar",
          full_name: "Fajar Dirgantara",
          child_order: "Putra ketiga dari",
          parents: "Bapak Sudirman & Ibu Yuliana",
          residence: "Depok - Jawa Barat",
          instagram: "fajar.dirga",
          photo: "/themes/floating-emas/groom.png",
        },
        section_icon: "/themes/floating-emas/icon-mempelai.svg",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("event-details", "formal", 3, {
        intro:
          "Merupakan suatu kehormatan dan kebahagiaan bagi kami atas kehadiran Bapak/Ibu/Saudara/i untuk memberikan doa restu kepada putra-putri kami.",
        events: [
          {
            name: "Akad Nikah",
            date: inDays(45),
            start_time: "10:00",
            end_time: "11:00",
            venue_name: "Kediaman Mempelai Wanita",
            address: "Jl. Pajajaran No. 57, Baranangsiang, Bogor",
            maps_url: "https://www.google.com/maps/search/?api=1&query=-6.597147,106.806039",
          },
          {
            name: "Resepsi",
            date: inDays(45),
            start_time: "11:00",
            end_time: "14:00",
            venue_name: "Kediaman Mempelai Wanita",
            address: "Jl. Pajajaran No. 57, Baranangsiang, Bogor",
            maps_url: "https://www.google.com/maps/search/?api=1&query=-6.597147,106.806039",
          },
        ],
        ...themeDecor(FLOATING_EMAS),
      }),
      s("map-location", "embed", 4, {
        venue_name: "Kediaman Mempelai Wanita",
        address: "Jl. Pajajaran No. 57, Baranangsiang, Kec. Bogor Timur, Kota Bogor",
      }),
      s("story", "timeline", 5, {
        eyebrow: "Cerita kami berawal dari sini",
        title: "Kisah Kami",
        items: [
          { year: "21 Juli 2020", title: "Pertemuan Pertama", description: "Sebuah pertemuan sederhana menjadi awal perjalanan kami.", image: "/themes/floating-emas/story-1.png" },
          { year: "23 September 2020", title: "Menjalin Hubungan", description: "Kami memutuskan untuk saling mengenal lebih jauh.", image: "/themes/floating-emas/story-2.png" },
          { year: "19 November 2021", title: "Lamaran", description: "Awal dari perjalanan bersama kedua keluarga.", image: "/themes/floating-emas/story-3.png" },
        ],
        section_icon: "/themes/floating-emas/icon-kisah.svg",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("gallery", "spotlight", 6, {
        images: [
          { url: "/themes/floating-emas/gallery-1.png", caption: "Prewedding" },
          { url: "/themes/floating-emas/gallery-2.png", caption: "Momen berdua" },
          { url: "/themes/floating-emas/gallery-3.png", caption: "Menuju hari bahagia" },
          { url: "/themes/floating-emas/gallery-4.png", caption: "Bersama keluarga" },
        ],
        section_icon: "/themes/floating-emas/icon-galeri.svg",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("countdown", "plain", 7, {
        target_date: inDays(45),
        section_icon: "/themes/floating-emas/icon-countdown.svg",
        save_the_date_image: "/themes/floating-emas/save-the-date.gif",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("gift", "cards", 8, {
        intro: "Doa restu Anda merupakan karunia yang sangat berarti. Namun jika memberi lebih, dapat melalui:",
        section_icon: "/themes/floating-emas/icon-hadiah.svg",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("rsvp", "form-card", 9, {}),
      s("guestbook", "chat", 10, {
        section_icon: "/themes/floating-emas/icon-bukutamu.svg",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("closing", "thankyou", 11, {
        names: "Naura & Fajar",
        message: "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.",
        ...themeDecor(FLOATING_EMAS),
      }),
      s("music", "disc", 12, {}),
      s("navigation", "bar", 13, {}),
    ],
  },
  {
    id: "floating-terracotta",
    name: "Floating Terracotta",
    description:
      "Watercolor peach-terracotta lembut, ranting daun bulu berwarna hangat di sudut, kartu putih membulat — hangat dan romantis.",
    category: "wedding",
    tier: "premium",
    thumbnail: "/templates/floating-terracotta/card",
    global_settings: {
      font_family: "Parisienne",
      color_primary: "#c17a48",
      color_secondary: "#7d4e3b",
      color_background: "#f0f4ed",
      animation: "fade-up",
    },
    sections: [
      s("cover", "floating", 0, {
        names: "Gani & Mikha",
        tagline: "The Wedding Of",
        note: "Kepada Yth. Bapak/Ibu/Saudara/i :",
        button_label: "Buka Undangan",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("quote", "bordered", 1, {
        text: "Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu mengingat kebesaran Allah.",
        source: "Q.S. Az-Zariyat: 49",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("couple-intro", "card", 2, {
        bride: {
          name: "Mikha",
          full_name: "Mikha Talia",
          child_order: "Putri pertama dari",
          parents: "Bapak Robert Talia & Ibu Sherly Wijaya",
          residence: "Bandung - Jawa Barat",
          instagram: "mikha.talia",
          photo: "/themes/floating-terracotta/bride.png",
        },
        groom: {
          name: "Gani",
          full_name: "Gani Abdul Rahman",
          child_order: "Putra kedua dari",
          parents: "Bapak H. Abdul Rahman & Ibu Hj. Nurhayati",
          residence: "Cimahi - Jawa Barat",
          instagram: "gani.abdul",
          photo: "/themes/floating-terracotta/groom.png",
        },
        section_icon: "/themes/floating-terracotta/icon-mempelai.svg",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("event-details", "formal", 3, {
        intro: "Merupakan suatu kehormatan dan kebahagiaan bagi kami atas kehadiran Bapak/Ibu/Saudara/i untuk memberikan doa restu kepada putra-putri kami.",
        events: [
          {
            name: "Akad Nikah",
            date: inDays(50),
            start_time: "10:00",
            end_time: "12:00",
            venue_name: "Kediaman Mempelai Wanita",
            address: "Jl. Pajajaran No. 57, Baranangsiang, Bogor",
            maps_url: "https://www.google.com/maps/search/?api=1&query=-6.597147,106.806039",
          },
          {
            name: "Resepsi",
            date: inDays(50),
            start_time: "12:00",
            end_time: "14:00",
            venue_name: "Kediaman Mempelai Wanita",
            address: "Jl. Pajajaran No. 57, Baranangsiang, Bogor",
            maps_url: "https://www.google.com/maps/search/?api=1&query=-6.597147,106.806039",
          },
        ],
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("map-location", "embed", 4, {
        venue_name: "Kediaman Mempelai Wanita",
        address: "Jl. Pajajaran No. 57, Baranangsiang, Kec. Bogor Timur, Kota Bogor",
      }),
      s("story", "timeline", 5, {
        eyebrow: "Cerita kami berawal dari sini",
        title: "Kisah Kami",
        items: [
          { year: "21 Juli 2020", title: "Pertemuan Pertama", description: "Kami bertemu dan mulai saling mengenal.", image: "/themes/floating-terracotta/story-1.png" },
          { year: "23 September 2020", title: "Menjalin Hubungan", description: "Kami menjalani hubungan yang lebih serius.", image: "/themes/floating-terracotta/story-2.png" },
          { year: "19 November 2021", title: "Lamaran", description: "Lamaran sederhana bersama kedua keluarga.", image: "/themes/floating-terracotta/story-3.png" },
        ],
        section_icon: "/themes/floating-terracotta/icon-kisah.svg",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("gallery", "spotlight", 6, {
        images: [
          { url: "/themes/floating-terracotta/gallery-1.png", caption: "Prewedding" },
          { url: "/themes/floating-terracotta/gallery-2.png", caption: "Momen berdua" },
          { url: "/themes/floating-terracotta/gallery-3.png", caption: "Menuju hari bahagia" },
          { url: "/themes/floating-terracotta/gallery-4.png", caption: "Bersama keluarga" },
        ],
        section_icon: "/themes/floating-terracotta/icon-galeri.svg",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("countdown", "plain", 7, {
        target_date: inDays(50),
        section_icon: "/themes/floating-terracotta/icon-countdown.svg",
        save_the_date_image: "/themes/floating-terracotta/save-the-date.gif",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("gift", "cards", 8, {
        intro: "Doa restu Anda merupakan karunia yang sangat berarti. Namun jika memberi lebih, dapat melalui:",
        section_icon: "/themes/floating-terracotta/icon-hadiah.svg",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("rsvp", "form-card", 9, {}),
      s("guestbook", "chat", 10, {
        section_icon: "/themes/floating-terracotta/icon-bukutamu.svg",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("closing", "thankyou", 11, {
        names: "Gani & Mikha",
        message: "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.",
        ...themeDecor(FLOATING_TERRACOTTA),
      }),
      s("music", "disc", 12, {}),
      s("navigation", "bar", 13, {}),
    ],
  },
];

export function getTemplate(id: string): TemplatePreset | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
