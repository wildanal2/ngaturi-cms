import type { Metadata } from "next";
import { Check } from "lucide-react";
import { MarketingPage, PageHeading } from "@/components/marketing/page-shell";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Harga — Ngaturi" };

const PLANS = [
  {
    name: "Gratis",
    price: "Rp 0",
    note: "1 undangan · 3 hari coba semua fitur",
    features: [
      "Semua template & bagian",
      "Coba semua fitur Premium 3 hari",
      "Undangan per-tamu (selama coba)",
      "RSVP, buku tamu, galeri",
      "Ada watermark Ngaturi",
    ],
    cta: "Mulai gratis",
  },
  {
    name: "Basic",
    price: "Rp 49.000",
    note: "sekali bayar per undangan",
    features: [
      "Tanpa watermark",
      "+1 kuota membuat undangan",
      "30 foto galeri",
      "Edit selama undangan aktif",
      "Analitik dasar",
    ],
    cta: "Pilih Basic",
    highlight: true,
  },
  {
    name: "Premium",
    price: "Rp 99.000",
    note: "sekali bayar per undangan",
    features: [
      "Semua fitur Basic",
      "+1 kuota membuat undangan",
      "Foto galeri tanpa batas",
      "Undangan per-tamu permanen",
      "Musik latar & analitik lengkap",
    ],
    cta: "Pilih Premium",
  },
];

export default function PricingPage() {
  return (
    <MarketingPage>
      <PageHeading
        title="Harga"
        description="Bayar sekali per undangan — bukan langganan. Coba semua fitur gratis dulu selama masa trial."
        center
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl border bg-paper p-6 ${
              p.highlight
                ? "border-forest shadow-lg md:-mt-3 md:mb-3"
                : "border-line"
            }`}
          >
            {p.highlight ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3 py-0.5 text-[11px] font-semibold text-cream">
                Paling populer
              </span>
            ) : null}
            <h2 className="text-lg">{p.name}</h2>
            <p className="mt-3 font-display text-3xl text-ink">{p.price}</p>
            <p className="mt-1 text-sm text-muted">{p.note}</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-soft">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-forest"
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/login"
              size="md"
              variant={p.highlight ? "primary" : "outline"}
              className="mt-6 w-full"
            >
              {p.cta}
            </ButtonLink>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted">
        Pembayaran online diproses aman oleh DOKU. Untuk sekarang paket Basic dan
        Premium memberi manfaat yang sama.
      </p>
    </MarketingPage>
  );
}
