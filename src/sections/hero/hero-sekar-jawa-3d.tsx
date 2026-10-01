import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import styles from "../sekar-jawa-3d/sekar-jawa-3d.module.css";
import { JasmineOrnament } from "../sekar-jawa-3d/jasmine-ornament";

/** Royal garden title card; event date is injected from event-details. */
export function HeroSekarJawa3D({ props }: SectionRenderProps) {
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
          className={`${styles.royalHeroPortrait} relative mx-auto aspect-[3/4] overflow-hidden rounded-t-full border-2 border-[color-mix(in_srgb,var(--inv-secondary)_60%,transparent)] shadow-xl`}
          data-ceremony-reveal="80"
        >
          <Image
            src={p.background_image}
            alt=""
            fill
            preload
            sizes="160px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div>
        <p
          data-ceremony-reveal="100"
          className="text-xs tracking-[0.28em] text-[var(--inv-secondary)] uppercase"
        >
          {p.tagline || "The Wedding of"}
        </p>
        <h1
          className={`${styles.royalHeroTitle} mt-3 font-[family-name:var(--inv-font)] leading-tight text-[var(--inv-primary)]`}
          data-ceremony-reveal="220"
        >
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        {p.event_date ? (
          <p
            data-ceremony-reveal="360"
            className="mt-5 text-sm tracking-wider text-[var(--inv-ink)]"
          >
            {formatEventDate(p.event_date)}
          </p>
        ) : null}
        <div data-ceremony-reveal="480">
          <JasmineOrnament className={styles.jasmineOrnament} />
        </div>
        <p className={styles.journeyHint}>Gulir untuk menyusuri kisah kami</p>
      </div>
    </section>
  );
}
