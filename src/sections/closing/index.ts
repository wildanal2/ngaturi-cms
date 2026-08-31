import type { SectionDefinition } from "../types";
import { ClosingProps } from "../schema";
import { ClosingSimple } from "./closing-simple";
import { ClosingPhoto } from "./closing-photo";

export { ClosingSimple, ClosingPhoto };

export const closingSection: SectionDefinition = {
  type: "closing",
  name: "Penutup / Terima Kasih",
  description: "Ucapan penutup dari mempelai",
  icon: "Heart",
  category: "footer",
  variants: {
    simple: {
      name: "Teks Sederhana",
      component: ClosingSimple,
      propsSchema: ClosingProps,
      fields: [
        { kind: "textarea", key: "message", label: "Pesan penutup" },
        { kind: "text", key: "names", label: "Nama" },
      ],
      defaultProps: { names: "Dinda & Raka" },
    },
    photo: {
      name: "Dengan Foto",
      component: ClosingPhoto,
      propsSchema: ClosingProps,
      fields: [
        { kind: "textarea", key: "message", label: "Pesan penutup" },
        { kind: "text", key: "names", label: "Nama" },
        { kind: "image", key: "photo", label: "Foto latar" },
      ],
      defaultProps: { names: "Dinda & Raka" },
    },
  },
};
