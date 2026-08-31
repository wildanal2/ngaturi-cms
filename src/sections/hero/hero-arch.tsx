import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import styles from "./hero.module.css";

/** Arched photo with an ornamental corner frame. */
export function HeroArch({ props, guestName }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    event_date?: string;
    tagline?: string;
    background_image?: string;
    s_frame?: string;
  };
  return (
    <section className="bg-[var(--inv-bg)] px-6 py-16 text-center text-[var(--inv-primary)]">
      <div className={p.s_frame === "plain" ? "px-2 py-6" : styles.ornFrame}>
        {p.tagline ? (
          <p className="text-xs tracking-[0.3em] uppercase">{p.tagline}</p>
        ) : null}
        <div className={styles.arch + " mx-auto mt-5 h-72 w-56"}>
          {p.background_image ? (
            <Image
              src={p.background_image}
              alt=""
              width={224}
              height={288}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)]" />
          )}
        </div>
        <h1 className="mt-5 font-[family-name:var(--inv-font)] text-4xl">
          {p.couple_names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-2 text-sm text-[var(--inv-ink)]">
          {formatEventDate(p.event_date)}
        </p>
        {guestName ? (
          <p className="mt-4 text-xs text-[var(--inv-ink)]">Kepada Yth. {guestName}</p>
        ) : null}
      </div>
    </section>
  );
}
