import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";

/** Royal garden title card; event date is injected from event-details. */
export function HeroEnchantedGarden({ props }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    tagline?: string;
    event_date?: string;
    background_image?: string;
  };

  return (
    <section className="grid gap-6 px-6 py-10 text-center sm:grid-cols-[0.85fr_1.15fr] sm:items-center sm:text-left">
      {p.background_image ? (
        <div className="relative mx-auto aspect-[3/4] w-36 overflow-hidden rounded-t-full border-4 border-[color-mix(in_srgb,var(--inv-secondary)_60%,transparent)] shadow-xl sm:w-full">
          <Image src={p.background_image} alt="" fill priority className="object-cover" />
        </div>
      ) : null}
      <div>
        <p className="text-xs tracking-[0.32em] text-[var(--inv-secondary)] uppercase">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-3 font-[family-name:var(--inv-font)] text-4xl leading-tight text-[var(--inv-primary)] sm:text-5xl">
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-5 text-sm tracking-wider text-[var(--inv-ink)]">
          {formatEventDate(p.event_date)}
        </p>
      </div>
    </section>
  );
}
