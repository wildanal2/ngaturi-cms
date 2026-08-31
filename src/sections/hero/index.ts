import type { SectionDefinition } from "../types";
import { HeroProps } from "../schema";
import { dummyHero } from "../dummy";
import { heroBase, nowPlus, sOverlay, sTextPos } from "../fields";
import { HeroCentered } from "./hero-centered";
import { HeroSplit } from "./hero-split";
import { HeroMinimal } from "./hero-minimal";
import { HeroBotanical } from "./hero-botanical";
import { HeroArch } from "./hero-arch";
import { HeroGarland } from "./hero-garland";

export { HeroCentered, HeroSplit, HeroMinimal, HeroBotanical, HeroArch, HeroGarland };

const baseDefaults = {
  couple_names: "Dinda & Raka",
  tagline: "The Wedding Of",
  event_date: nowPlus(45),
};

export const heroSection: SectionDefinition = {
  type: "hero",
  name: "Sampul / Pembuka",
  description: "Bagian pertama yang dilihat tamu",
  icon: "Sparkles",
  category: "hero",
  dummyProps: (variantKey, base) => {
    if (!base.background_image) base.background_image = dummyHero(variantKey);
  },
  variants: {
    centered: {
      name: "Foto Fullscreen",
      description: "Foto memenuhi layar, teks di atasnya",
      component: HeroCentered,
      propsSchema: HeroProps,
      fields: [...heroBase, { kind: "image", key: "background_image", label: "Foto latar" }],
      styleOptions: [sOverlay, sTextPos],
      defaultProps: { ...baseDefaults, has_countdown: true },
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
      defaultProps: { ...baseDefaults },
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
      defaultProps: { ...baseDefaults },
    },
    garland: {
      name: "Garland Navy",
      description: "Watercolor biru, garland bunga, dan ilustrasi pasangan penuh",
      component: HeroGarland,
      propsSchema: HeroProps,
      fields: [
        ...heroBase,
        { kind: "text", key: "bismillah", label: "Basmalah (opsional)" },
        { kind: "image", key: "background_image", label: "Latar watercolor" },
        { kind: "image", key: "couple_image", label: "Ilustrasi pasangan" },
        { kind: "image", key: "garland_left_image", label: "Bunga atas kiri" },
        { kind: "image", key: "garland_right_image", label: "Bunga atas kanan" },
        { kind: "image", key: "flower_left_image", label: "Bunga bawah kiri" },
        { kind: "image", key: "flower_right_image", label: "Bunga bawah kanan" },
      ],
      defaultProps: {
        ...baseDefaults,
        bismillah: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم",
      },
    },
    botanical: {
      name: "Botani (bunga)",
      description: "Foto bulat, garland atas + eucalyptus di sudut",
      component: HeroBotanical,
      propsSchema: HeroProps,
      fields: [
        ...heroBase,
        { kind: "image", key: "background_image", label: "Foto" },
        { kind: "image", key: "background_texture", label: "Tekstur latar (opsional)" },
        { kind: "image", key: "garland_left_image", label: "Bunga atas kiri (opsional)" },
        { kind: "image", key: "garland_right_image", label: "Bunga atas kanan (opsional)" },
        { kind: "image", key: "flower_left_image", label: "Bunga bawah kiri (opsional)" },
        { kind: "image", key: "flower_right_image", label: "Bunga bawah kanan (opsional)" },
      ],
      styleOptions: [
        {
          key: "palette",
          label: "Nuansa",
          default: "cream",
          options: [
            { value: "cream", label: "Terang" },
            { value: "noir", label: "Gelap" },
          ],
        },
      ],
      defaultProps: { ...baseDefaults, couple_names: "Kana & Arya" },
    },
    arch: {
      name: "Foto Melengkung + Ornamen",
      description: "Foto arch dengan bingkai sudut",
      component: HeroArch,
      propsSchema: HeroProps,
      fields: [...heroBase, { kind: "image", key: "background_image", label: "Foto" }],
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
      defaultProps: { ...baseDefaults },
    },
  },
};
