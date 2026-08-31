import type { SectionDefinition } from "../types";
import { NavigationProps } from "../schema";
import { NavigationBar } from "./navigation-bar";

export { NavigationBar };

export const navigationSection: SectionDefinition = {
  type: "navigation",
  name: "Navigasi",
  description: "Bar navigasi mengambang ke tiap bagian",
  icon: "Menu",
  category: "footer",
  variants: {
    bar: {
      name: "Bar Bawah",
      description: "Ikon otomatis mengikuti bagian yang ada",
      component: NavigationBar,
      propsSchema: NavigationProps,
      fields: [],
      defaultProps: {},
    },
  },
};
