import localFont from "next/font/local";

// Official, unmodified Google Fonts Latin distributions; notices accompany them.
// No global layout font or preload: other templates keep their typography.
const cinzel = localFont({
  src: "../../../public/themes/serambi-delima/fonts/cinzel-latin.woff2",
  variable: "--sd-font-display",
  weight: "400 600",
  display: "swap",
  preload: false,
  fallback: ["Georgia"],
});

const playfair = localFont({
  src: "../../../public/themes/serambi-delima/fonts/playfair-display-latin.woff2",
  variable: "--sd-font-body",
  weight: "400 600",
  display: "swap",
  preload: false,
  fallback: ["Georgia"],
});

export const serambiFonts = `${cinzel.variable} ${playfair.variable}`;
