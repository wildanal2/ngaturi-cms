import type { SectionDefinition } from "../types";
import { QuoteProps } from "../schema";
import { QuoteCentered } from "./quote-centered";
import { QuoteBordered } from "./quote-bordered";

export { QuoteCentered, QuoteBordered };

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
