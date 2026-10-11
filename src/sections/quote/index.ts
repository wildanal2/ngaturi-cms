import type { SectionDefinition } from "../types";
import { QuoteCinematicVintage } from "./quote-cinematic-vintage";
export { QuoteCinematicVintage };
import { QuoteProps } from "../schema";
import { QuoteCentered } from "./quote-centered";
import { QuoteBordered } from "./quote-bordered";
import { QuoteSerambiDelima } from "./quote-serambi-delima";

export { QuoteCentered, QuoteBordered, QuoteSerambiDelima };

const quoteFields = [
  { kind: "textarea", key: "text", label: "Teks kutipan" },
  { kind: "text", key: "source", label: "Sumber" },
] as const;

const quoteDefaults = {
  text: "Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri.",
  source: "QS. Ar-Rum: 21",
};

export const quoteSection: SectionDefinition = {
  type: "quote",
  name: "Kutipan",
  description: "Ayat atau kutipan",
  icon: "Quote",
  category: "content",
  variants: {
    "cinematic-vintage": {
      name: "Sinematik Vintage",
      description: "Bingkai heritage dalam perjalanan kamera berbasis scroll",
      component: QuoteCinematicVintage,
      propsSchema: QuoteProps,
      fields: [...quoteFields],
      defaultProps: { ...quoteDefaults },
      isPremium: true,
    },
    centered: {
      name: "Tengah",
      component: QuoteCentered,
      propsSchema: QuoteProps,
      fields: [...quoteFields],
      defaultProps: { ...quoteDefaults },
    },
    bordered: {
      name: "Garis Ornamen",
      description: "Dengan garis rambut atas–bawah",
      component: QuoteBordered,
      propsSchema: QuoteProps,
      fields: [...quoteFields],
      defaultProps: { ...quoteDefaults },
    },
  },
};

quoteSection.variants["serambi-delima"] = {
  ...quoteSection.variants.centered,
  name: "Serambi Delima",
  description:
    "Kutipan atau doa dengan dukungan teks Arab dan terjemahan berbaris",
  component: QuoteSerambiDelima,
  fields: [
    {
      kind: "textarea",
      key: "text",
      label: "Teks kutipan atau doa",
      help: "Pisahkan teks Arab dan terjemahan dengan baris baru.",
    },
    { kind: "text", key: "source", label: "Sumber atau atribusi (opsional)" },
  ],
  defaultProps: { text: "", source: "" },
  isPremium: true,
};
