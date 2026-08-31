import type { SectionDefinition } from "../types";
import { CoupleIntroProps } from "../schema";
import { dummyBride, dummyGroom } from "../dummy";
import { coupleFields, sPhotoShape } from "../fields";
import { CoupleSideBySide } from "./couple-side-by-side";
import { CoupleStacked } from "./couple-stacked";
import { CouplePolaroid } from "./couple-polaroid";
import { CoupleCard } from "./couple-card";
import { CoupleDuoPortrait } from "./couple-duo-portrait";
import { CoupleFloating17 } from "./couple-floating17";

export {
  CoupleSideBySide,
  CoupleStacked,
  CouplePolaroid,
  CoupleCard,
  CoupleDuoPortrait,
  CoupleFloating17,
};

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
    "duo-portrait": {
      name: "Dua Portrait Arch",
      description: "Dua foto arch berdampingan dengan watercolor dan bunga sudut khas kana1",
      component: CoupleDuoPortrait,
      propsSchema: CoupleIntroProps,
      fields: [
        { kind: "text", key: "eyebrow", label: "Teks kecil di atas" },
        { kind: "text", key: "title", label: "Judul" },
        ...coupleFields,
        { kind: "image", key: "background_image", label: "Latar watercolor" },
        { kind: "image", key: "divider_image", label: "Ilustrasi pembatas bawah" },
        { kind: "image", key: "flower_left_image", label: "Bunga bawah kiri" },
        { kind: "image", key: "flower_right_image", label: "Bunga bawah kanan" },
      ],
      styleOptions: [
        sPhotoShape,
        {
          key: "ornament",
          label: "Ornamen",
          default: "corners",
          options: [
            { value: "corners", label: "Bunga sudut" },
            { value: "plain", label: "Polos" },
          ],
        },
      ],
      defaultProps: {
        eyebrow: "The Bride & Groom",
        title: "Calon Mempelai",
        bride: { name: "Dinda", full_name: "Dinda Ayu Pratiwi" },
        groom: { name: "Raka", full_name: "Raka Wibowo" },
      },
    },
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
    floating17: {
      name: "Mempelai Floating17",
      description: "Dua portrait bulat berdampingan dengan tipografi sage dan Instagram",
      component: CoupleFloating17,
      propsSchema: CoupleIntroProps,
      fields: [
        { kind: "text", key: "title", label: "Judul" },
        ...coupleFields,
        { kind: "image", key: "background_image", label: "Tekstur latar" },
        { kind: "image", key: "section_icon", label: "Ikon bagian" },
        { kind: "image", key: "divider_image", label: "Gambar divider" },
      ],
      defaultProps: {
        title: "Mempelai",
        bride: { name: "Hani", full_name: "Hani Ramadani" },
        groom: { name: "Hari", full_name: "Hari Septriansyah" },
        background_image: "/themes/sage-hijau-melayang/bg-floating17.png",
        section_icon: "/themes/sage-hijau-melayang/icon-couple.svg",
        divider_image: "/themes/sage-hijau-melayang/divider.png",
      },
    },
    card: {
      name: "Kartu Melayang",
      description: "Kartu putih, foto bulat, IG & daerah asal, hiasan daun",
      component: CoupleCard,
      propsSchema: CoupleIntroProps,
      fields: coupleFields,
      defaultProps: {
        bride: {
          name: "Dinda",
          full_name: "Dinda Ayu Pratiwi",
          child_order: "Putri kedua dari",
          parents: "Bapak Arifin & Ibu Nurul",
          residence: "Bandung",
        },
        groom: {
          name: "Raka",
          full_name: "Raka Wibowo",
          child_order: "Putra pertama dari",
          parents: "Bapak Syamsun & Ibu Azizah",
          residence: "Jombang",
        },
      },
    },
  },
};
