import type { SectionDefinition } from "../types";
import { ClosingCinematicVintage } from "./closing-cinematic-vintage";
export { ClosingCinematicVintage };
import { ClosingProps } from "../schema";
import { dummyClosing } from "../dummy";
import { ClosingSimple } from "./closing-simple";
import { ClosingPhoto } from "./closing-photo";
import { ClosingThankYou } from "./closing-thankyou";

export { ClosingSimple, ClosingPhoto, ClosingThankYou };

export const closingSection: SectionDefinition = {
  type: "closing",
  name: "Penutup / Terima Kasih",
  description: "Ucapan penutup dari mempelai",
  icon: "Heart",
  category: "footer",
  dummyProps: (variantKey, base) => {
    if ((variantKey === "photo" || variantKey === "cinematic-vintage") && !base.photo) base.photo = dummyClosing();
  },
  variants: {
    "cinematic-vintage": {
      name: "Sinematik Vintage",
      description: "Bingkai heritage dalam perjalanan kamera berbasis scroll",
      component: ClosingCinematicVintage,
      propsSchema: ClosingProps,
      fields: [{ kind: "text", key: "names", label: "Nama" }, { kind: "textarea", key: "message", label: "Pesan penutup" }, { kind: "image", key: "photo", label: "Foto pasangan" }],
      defaultProps: { names: "Dinda & Raka", message: "Merupakan kebahagiaan bagi kami untuk berbagi hari ini bersama Anda. Terima kasih atas doa dan restunya." },
      isPremium: true,
    },
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
    thankyou: {
      name: "Thank You",
      description: "Tulisan tangan besar + hiasan daun bergoyang",
      component: ClosingThankYou,
      propsSchema: ClosingProps,
      fields: [
        { kind: "textarea", key: "message", label: "Pesan penutup" },
        { kind: "text", key: "names", label: "Nama" },
      ],
      defaultProps: { names: "Dinda & Raka" },
    },
  },
};
