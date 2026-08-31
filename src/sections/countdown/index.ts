import type { SectionDefinition } from "../types";
import { CountdownProps } from "../schema";
import { countdownFields, nowPlus } from "../fields";
import { CountdownMinimal } from "./countdown-minimal";
import { CountdownFlip } from "./countdown-flip";
import { CountdownRings } from "./countdown-rings";
import { CountdownPill } from "./countdown-pill";
import { CountdownElegant } from "./countdown-elegant";
import { CountdownPlain } from "./countdown-plain";

export {
  CountdownMinimal,
  CountdownFlip,
  CountdownRings,
  CountdownPill,
  CountdownElegant,
  CountdownPlain,
};

const calendarField = {
  kind: "url" as const,
  key: "calendar_url",
  label: "Link tambah ke kalender (opsional)",
};

const d = () => ({ target_date: nowPlus(45) });

export const countdownSection: SectionDefinition = {
  type: "countdown",
  name: "Hitung Mundur",
  description: "Menuju hari-H",
  icon: "Timer",
  category: "interactive",
  variants: {
    minimal: {
      name: "Kotak Minimalis",
      component: CountdownMinimal,
      propsSchema: CountdownProps,
      fields: countdownFields,
      defaultProps: d(),
    },
    flip: {
      name: "Flip Clock",
      description: "Kartu gelap bergaya jam flip",
      component: CountdownFlip,
      propsSchema: CountdownProps,
      fields: countdownFields,
      defaultProps: d(),
    },
    rings: {
      name: "Cincin Progres",
      description: "Lingkaran progres berwarna",
      component: CountdownRings,
      propsSchema: CountdownProps,
      fields: countdownFields,
      defaultProps: d(),
    },
    pill: {
      name: "Satu Baris",
      description: "Ringkas dalam satu pill",
      component: CountdownPill,
      propsSchema: CountdownProps,
      fields: countdownFields,
      defaultProps: d(),
    },
    elegant: {
      name: "Serif Elegan",
      description: "Angka serif besar",
      component: CountdownElegant,
      propsSchema: CountdownProps,
      fields: countdownFields,
      styleOptions: [
        {
          key: "sep",
          label: "Pemisah",
          default: "dot",
          options: [
            { value: "dot", label: "Titik" },
            { value: "none", label: "Tanpa" },
          ],
        },
      ],
      defaultProps: d(),
    },
    plain: {
      name: "Save The Date",
      description: "Angka tebal sederet + tombol kalender, hiasan daun",
      component: CountdownPlain,
      propsSchema: CountdownProps,
      fields: [...countdownFields, calendarField],
      defaultProps: d(),
    },
  },
};
