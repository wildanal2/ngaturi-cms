import type { SectionDefinition } from "../types";
import { GiftProps } from "../schema";
import { giftFields } from "../fields";
import { GiftCards } from "./gift-cards";
import { GiftMinimal } from "./gift-minimal";

export { GiftCards, GiftMinimal };

export const giftSection: SectionDefinition = {
  type: "gift",
  name: "Amplop Digital",
  description: "Rekening & e-wallet hadiah",
  icon: "Gift",
  category: "content",
  variants: {
    cards: {
      name: "Kartu Bank",
      component: GiftCards,
      propsSchema: GiftProps,
      fields: giftFields,
      defaultProps: {
        intro:
          "Doa restu Anda merupakan karunia yang sangat berarti. Namun jika memberi lebih, dapat melalui:",
        bank_accounts: [
          { bank_name: "Bank BCA", account_number: "1234567890", account_name: "Dinda Ayu Pratiwi" },
          { bank_name: "Bank Mandiri", account_number: "0987654321", account_name: "Raka Wibowo" },
          { bank_name: "GoPay", account_number: "0812-3456-7890", account_name: "Dinda Ayu" },
        ],
      },
    },
    minimal: {
      name: "Daftar Ringkas",
      description: "Satu blok daftar rekening",
      component: GiftMinimal,
      propsSchema: GiftProps,
      fields: giftFields,
      defaultProps: {
        intro: "Kirimkan tanda kasih Anda melalui:",
        bank_accounts: [
          { bank_name: "Bank BCA", account_number: "1234567890", account_name: "Dinda Ayu Pratiwi" },
          { bank_name: "Bank Mandiri", account_number: "0987654321", account_name: "Raka Wibowo" },
        ],
      },
    },
  },
};
