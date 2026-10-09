import { z } from "zod";
import type { SectionDefinition } from "../types";
import { LoadingCinematicVintage } from "./loading-cinematic-vintage";
import { DEFAULT_LOADING_MESSAGE } from "./resolve";

export const loadingSection: SectionDefinition = {
  type: "loading",
  name: "Loading / Persiapan",
  description: "Menyiapkan tampilan pembuka sebelum undangan dibuka",
  icon: "Hourglass",
  category: "hero",
  variants: {
    "cinematic-vintage": {
      name: "Cinematic Vintage",
      component: LoadingCinematicVintage,
      propsSchema: z.object({
        message: z.string().default(DEFAULT_LOADING_MESSAGE),
      }),
      defaultProps: { message: DEFAULT_LOADING_MESSAGE },
      fields: [{ kind: "text", key: "message", label: "Pesan persiapan" }],
      isPremium: true,
    },
  },
};
