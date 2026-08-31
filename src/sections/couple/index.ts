import type { SectionDefinition } from "../types";
import { CoupleIntroProps } from "../schema";
import { dummyBride, dummyGroom } from "../dummy";
import { coupleFields, sPhotoShape } from "../fields";
import { CoupleSideBySide } from "./couple-side-by-side";
import { CoupleStacked } from "./couple-stacked";
import { CouplePolaroid } from "./couple-polaroid";

export { CoupleSideBySide, CoupleStacked, CouplePolaroid };

export const coupleSection: SectionDefinition = {
  type: "couple-intro",
  name: "Mempelai",
  description: "Perkenalan kedua mempelai",
  icon: "Users",
  category: "content",
  dummyProps: (_variantKey, base) => {
    const bride = (base.bride ?? {}) as Record<string, unknown>;
    const groom = (base.groom ?? {}) as Record<string, unknown>;
    if (!bride.photo) base.bride = { ...bride, photo: dummyBride };
    if (!groom.photo) base.groom = { ...groom, photo: dummyGroom };
  },
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
};
