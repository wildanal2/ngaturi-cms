import type { SectionDefinition, StyleOption } from "../types";
import { NavigationProps } from "../schema";
import { NavigationBar } from "./navigation-bar";
import { NavigationDock } from "./navigation-dock";
import { NavigationRail } from "./navigation-rail";

export { NavigationBar, NavigationDock, NavigationRail };

const sSide: StyleOption = {
  key: "side",
  label: "Sisi",
  default: "right",
  options: [
    { value: "right", label: "Kanan" },
    { value: "left", label: "Kiri" },
  ],
};

export const navigationSection: SectionDefinition = {
  type: "navigation",
  name: "Navigasi",
  description: "Menu mengambang ke tiap bagian undangan",
  icon: "Menu",
  category: "footer",
  variants: {
    bar: {
      name: "Bar Bawah",
      description: "Bar penuh mengambang di bawah, ikon + label",
      component: NavigationBar,
      propsSchema: NavigationProps,
      fields: [],
      defaultProps: {},
    },
    dock: {
      name: "Dock Bulat",
      description: "Pil ikon ringkas mengambang di tengah bawah",
      component: NavigationDock,
      propsSchema: NavigationProps,
      fields: [],
      defaultProps: {},
    },
    rail: {
      name: "Rail Samping",
      description: "Deret ikon vertikal menempel di sisi kanan/kiri",
      component: NavigationRail,
      propsSchema: NavigationProps,
      fields: [],
      styleOptions: [sSide],
      defaultProps: {},
    },
  },
};
