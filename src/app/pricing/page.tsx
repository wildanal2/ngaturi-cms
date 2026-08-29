import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ButtonLink } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Harga — Ngaturi" };

const PLANS = [
  {
    name: "Gratis",
    price: "Rp 0",
    note: "1 undangan · edit 7 hari",
    features: ["Semua template dasar", "RSVP & buku tamu", "5 foto", "Watermark"],
    cta: "Mulai gratis",
  },
  {
    name: "Basic",
    price: "Rp 49k",
    note: "sekali bayar / undangan",
    features: ["Tanpa watermark", "30 foto", "Edit selama aktif", "Analytics dasar"],
    cta: "Pilih Basic",
    highlight: true,
  },
  {
    name: "Premium",
    price: "Rp 99k",
    note: "sekali bayar / undangan",
    features: ["Foto unlimited", "Undangan per-tamu", "Musik & video", "Analitik lengkap"],
    cta: "Pilih Premium",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-5 py-16">
        <h1 className="text-4xl">Harga</h1>
        <p className="mt-2 text-ink-soft">
          Bayar sekali per undangan — bukan langganan.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${
                p.highlight
                  ? "border-forest bg-paper"
                  : "border-line bg-paper"
              }`}
            >
              <h2 className="text-xl">{p.name}</h2>
              <p className="mt-2 font-display text-3xl text-forest">{p.price}</p>
              <p className="text-sm text-muted">{p.note}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <ButtonLink
                href="/login"
                size="sm"
                variant={p.highlight ? "primary" : "outline"}
                className="mt-5 w-full"
              >
                {p.cta}
              </ButtonLink>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          Pembayaran online (Midtrans) sedang disiapkan. Sementara, upgrade
          dilakukan manual oleh tim kami.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
