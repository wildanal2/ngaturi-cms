export type PaidPlan = "basic" | "premium";

export interface PlanInfo {
  id: PaidPlan;
  name: string;
  price: number; // IDR
  photos: number | "unlimited";
  perks: string[];
}

export const PLANS: Record<PaidPlan, PlanInfo> = {
  basic: {
    id: "basic",
    name: "Basic",
    price: 49_000,
    photos: 30,
    perks: [
      "Tanpa watermark",
      "Edit selama undangan aktif",
      "30 foto galeri",
      "RSVP + buku tamu + analitik dasar",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 99_000,
    photos: "unlimited",
    perks: [
      "Semua fitur Basic",
      "Foto galeri tanpa batas",
      "Undangan per-tamu (link personal)",
      "Musik & analitik lengkap",
    ],
  },
};

export const RENEWAL_PRICE = 25_000;
export const RENEWAL_DAYS = 90;
