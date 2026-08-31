import type { SectionDefinition } from "../types";
import { MusicProps2 } from "../schema";
import { musicPickerField, sMusicPosition } from "../fields";
import { MusicDisc } from "./music-disc";
import { MusicVinyl } from "./music-vinyl";
import { MusicBar } from "./music-bar";
import { MusicPill } from "./music-pill";

export { MusicDisc, MusicVinyl, MusicBar, MusicPill };

export const musicSection: SectionDefinition = {
  type: "music",
  name: "Musik Latar",
  description: "Musik yang diputar saat undangan dibuka",
  icon: "Music",
  category: "footer",
  variants: {
    disc: {
      name: "Piringan Berputar",
      description: "Tombol bulat, cover lagu berputar saat diputar",
      component: MusicDisc,
      propsSchema: MusicProps2,
      fields: [musicPickerField],
      styleOptions: [sMusicPosition],
      defaultProps: { autoplay: true },
    },
    vinyl: {
      name: "Piringan Hitam",
      description: "Pemutar piringan hitam (turntable) di dalam undangan",
      component: MusicVinyl,
      propsSchema: MusicProps2,
      fields: [musicPickerField],
      defaultProps: { autoplay: true },
    },
    bar: {
      name: "Bar Mini",
      description: "Pemutar mini mengambang: cover, judul, tombol",
      component: MusicBar,
      propsSchema: MusicProps2,
      fields: [musicPickerField],
      styleOptions: [sMusicPosition],
      defaultProps: { autoplay: true },
    },
    pill: {
      name: "Tombol Kecil",
      description: "Tombol musik ringkas di sudut",
      component: MusicPill,
      propsSchema: MusicProps2,
      fields: [musicPickerField],
      styleOptions: [sMusicPosition],
      defaultProps: { autoplay: true },
    },
  },
};
