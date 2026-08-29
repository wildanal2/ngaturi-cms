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
              className="overflow-hidden rounded-2xl border border-line bg-paper"
            >
              <Image
                src={t.thumbnail}
                alt={t.name}
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-5">
                <h2 className="text-xl">{t.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{t.description}</p>
                <ButtonLink href="/login" size="sm" className="mt-3">
                  Pakai template
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
