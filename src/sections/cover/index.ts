import type { SectionDefinition } from "../types";
import { CoverProps } from "../schema";
import { dummyHero } from "../dummy";
import { coverDefaults, coverFields, coverPhotoField, sCoverOverlay } from "../fields";
import { CoverClassic } from "./cover-classic";
import { CoverPhoto } from "./cover-photo";
import { CoverBotanical } from "./cover-botanical";
import { CoverMinimal } from "./cover-minimal";
import { CoverFloating } from "./cover-floating";
import { CoverWaxSeal } from "./cover-wax-seal";

export {
  CoverClassic,
  CoverPhoto,
  CoverBotanical,
  CoverMinimal,
  CoverFloating,
  CoverWaxSeal,
};

export const coverSection: SectionDefinition = {
  type: "cover",
  name: "Sampul / Buka Undangan",
  description: "Halaman pembuka sebelum isi undangan",
  icon: "BookOpen",
  category: "hero",
  dummyProps: (variantKey, base) => {
    if (variantKey !== "minimal" && !base.background_image) {
      base.background_image = dummyHero(`cover-${variantKey}`);
    }
  },
  variants: {
    classic: {
      name: "Klasik",
      description: "Warna solid / foto, teks di tengah",
      component: CoverClassic,
      propsSchema: CoverProps,
      fields: [...coverFields, coverPhotoField],
      styleOptions: [sCoverOverlay],
      defaultProps: { ...coverDefaults },
    },
    photo: {
      name: "Foto Fullscreen",
      description: "Foto memenuhi layar",
      component: CoverPhoto,
      propsSchema: CoverProps,
      fields: [...coverFields, coverPhotoField],
      styleOptions: [
        sCoverOverlay,
        {
          key: "align",
          label: "Posisi teks",
          default: "center",
          options: [
            { value: "top", label: "Atas" },
            { value: "center", label: "Tengah" },
            { value: "bottom", label: "Bawah" },
          ],
        },
      ],
      defaultProps: { ...coverDefaults },
    },
    botanical: {
      name: "Botani",
      description: "Ornamen bunga + foto bulat",
      component: CoverBotanical,
      propsSchema: CoverProps,
      fields: [...coverFields, coverPhotoField],
      defaultProps: { ...coverDefaults },
    },
    minimal: {
      name: "Minimalis",
      description: "Tipografi besar, tanpa foto",
      component: CoverMinimal,
      propsSchema: CoverProps,
      fields: coverFields,
      defaultProps: { ...coverDefaults },
    },
    floating: {
      name: "Botani Melayang",
      description: "Dedaunan bergoyang di sudut, nama tulisan tangan bertumpuk",
      component: CoverFloating,
      propsSchema: CoverProps,
      fields: [
        ...coverFields,
        { kind: "image", key: "background_image", label: "Tekstur latar (opsional)" },
        { kind: "image", key: "divider_image", label: "Gambar divider (opsional)" },
      ],
      defaultProps: { ...coverDefaults },
    },
    "wax-seal": {
      name: "Amplop + Segel Lilin",
      description: "Amplop kain gelap dengan lipatan diagonal & segel lilin diklik",
      component: CoverWaxSeal,
      propsSchema: CoverProps,
      fields: [
        ...coverFields,
        { kind: "text", key: "seal_label", label: "Teks di bawah segel" },
        { kind: "color", key: "envelope_color", label: "Warna amplop" },
        { kind: "color", key: "accent_color", label: "Warna teks emas" },
        { kind: "image", key: "texture_image", label: "Tekstur amplop (opsional)" },
        { kind: "image", key: "seal_image", label: "Gambar segel (opsional)" },
      ],
      defaultProps: {
        ...coverDefaults,
        seal_label: "Klik segel untuk membuka",
        envelope_color: "#182742",
        accent_color: "#c8a15e",
      },
    },
  },
};
