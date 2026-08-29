import Image from "next/image";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { TEMPLATES } from "@/lib/templates/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Template — Ngaturi" };

export default function TemplatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-5 py-16">
        <h1 className="text-4xl">Template</h1>
        <p className="mt-2 text-ink-soft">
          Semua template bisa dipakai gratis untuk undangan pertamamu.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper"
            >
              <a href={`/templates/${t.id}/preview`} className="group block">
                <Image
                  src={t.thumbnail}
                  alt={t.name}
                  width={400}
                  height={300}
                  className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]"
                />
              </a>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-xl">{t.name}</h2>
                <p className="mt-1 flex-1 text-sm text-ink-soft">
                  {t.description}
                </p>
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
                    Pakai template
                  </ButtonLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
