import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import styles from "../enchanted-garden/enchanted-garden.module.css";

/** Royal garden title card; event date is injected from event-details. */
export function HeroEnchantedGarden({ props }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    tagline?: string;
    event_date?: string;
    background_image?: string;
  };

  return (
    <section className={styles.royalHero}>
      {p.background_image ? (
        <div
          className={`${styles.royalHeroPortrait} relative mx-auto aspect-[3/4] overflow-hidden rounded-t-full border-4 border-[color-mix(in_srgb,var(--inv-secondary)_60%,transparent)] shadow-xl`}
        >
          <Image
            src={p.background_image}
            alt=""
            fill
            priority
            className="object-cover"
          />
        </div>
      ) : null}
      <div>
        <p className="text-xs tracking-[0.32em] text-[var(--inv-secondary)] uppercase">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1
          className={`${styles.royalHeroTitle} mt-3 font-[family-name:var(--inv-font)] leading-tight text-[var(--inv-primary)]`}
        >
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-5 text-sm tracking-wider text-[var(--inv-ink)]">
          {formatEventDate(p.event_date)}
        </p>
      </div>
    </section>
  );
}
