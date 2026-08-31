import type { SectionDefinition } from "../types";
import { CoverProps } from "../schema";
import { dummyHero } from "../dummy";
import { coverDefaults, coverFields, coverPhotoField, sCoverOverlay } from "../fields";
import { CoverClassic } from "./cover-classic";
import { CoverPhoto } from "./cover-photo";
import { CoverBotanical } from "./cover-botanical";
import { CoverMinimal } from "./cover-minimal";
import { CoverFloating } from "./cover-floating";

export { CoverClassic, CoverPhoto, CoverBotanical, CoverMinimal, CoverFloating };

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
      fields: coverFields,
      defaultProps: { ...coverDefaults },
    },
  },
};
