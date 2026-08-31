import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import styles from "./hero.module.css";

/** Minimal typographic hero, no photo. */
export function HeroMinimal({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    s_scale?: string;
  };
  const size = p.s_scale === "lg" ? "text-5xl" : "text-6xl";
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center bg-[var(--inv-bg)] px-6 py-20 text-center">
      {guestName ? (
        <p className="mb-6 text-xs tracking-widest text-[var(--inv-primary)] uppercase">
          Kepada Yth. {guestName}
        </p>
      ) : null}
      <p className={styles.hairline + " w-full max-w-[220px] text-xs tracking-[0.3em] uppercase"}>
        {p.tagline ?? "The Wedding Of"}
      </p>
      <h1
        className={`mt-6 font-[family-name:var(--inv-font)] ${size} leading-none text-[var(--inv-primary)]`}
      >
        {p.couple_names ?? "Nama Mempelai"}
      </h1>
      <p className="mt-6 text-[var(--inv-ink)]">{formatEventDate(p.event_date)}</p>
    </section>
  );
}
