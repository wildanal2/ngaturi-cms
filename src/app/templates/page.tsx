import Image from "next/image";
import type { Metadata } from "next";
import { MarketingPage, PageHeading } from "@/components/marketing/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { TEMPLATES } from "@/lib/templates/catalog";

export const metadata: Metadata = { title: "Template — Ngaturi" };

const TIER_LABEL: Record<string, string> = {
  free: "Gratis",
  basic: "Basic",
  premium: "Premium",
};

export default function TemplatesPage() {
  return (
    <MarketingPage>
      <PageHeading
        title="Pilih Template"
        description="Semua template bisa dicoba gratis untuk undangan pertamamu. Ganti warna, teks, foto, dan urutan bagian di editor."
      />

      <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <article
            key={t.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-md"
          >
            <a
              href={`/templates/${t.id}/preview`}
              className="relative block aspect-[3/4] overflow-hidden bg-cream-200"
            >
              <Image
                src={t.thumbnail}
                alt={t.name}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink shadow-sm">
                {TIER_LABEL[t.tier] ?? t.tier}
              </span>
            </a>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-lg leading-snug">{t.name}</h2>
              <p className="mt-1 flex-1 text-sm text-ink-soft">{t.description}</p>
              <div className="mt-4 flex gap-2">
                <ButtonLink
                  href={`/templates/${t.id}/preview`}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Lihat
                </ButtonLink>
                <ButtonLink
                  href={`/templates/${t.id}/use`}
                  size="sm"
                  className="flex-1"
                >
                  Pakai
                </ButtonLink>
              </div>
            </div>
          </article>
        ))}
      </div>
    </MarketingPage>
  );
}
