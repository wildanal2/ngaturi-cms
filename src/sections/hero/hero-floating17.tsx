import type { CSSProperties } from "react";
import type { SectionRenderProps } from "../types";
import { Floating17Ornaments } from "../ornaments";
import { formatEventDate } from "../shared";
import styles from "../floating17.module.css";

type Floating17HeroProps = {
  couple_names?: string;
  tagline?: string;
  event_date?: string;
  background_image?: string;
  ornament_tr_images?: string[];
  ornament_bl_images?: string[];
  divider_image?: string;
};

const PARTICLES = [
  [6, 4, 8, -2, 14], [13, 3, 10, -5, -18], [21, 5, 9, -1, 22],
  [30, 3, 11, -7, 12], [39, 4, 7, -3, -24], [47, 2, 9, -6, 18],
  [55, 5, 12, -4, -15], [64, 3, 8, -8, 20], [72, 4, 10, -2, -22],
  [81, 2, 7, -5, 14], [89, 5, 11, -7, -16], [96, 3, 9, -3, 12],
] as const;

export function HeroFloating17({ props }: SectionRenderProps) {
  const p = props as Floating17HeroProps;
  const [first, second] = (p.couple_names ?? "Hani & Hari").split("&").map((v) => v.trim());

  return (
    <section
      className={`${styles.bodyFont} relative flex min-h-[720px] items-center justify-center overflow-hidden px-6 py-24 text-center text-[#3A443D]`}
      style={p.background_image ? {
        backgroundImage: `url('${p.background_image}')`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      } : undefined}
    >
      <Floating17Ornaments
        trImages={p.ornament_tr_images ?? []}
        blImages={p.ornament_bl_images ?? []}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map(([left, size, duration, delay, drift], i) => (
          <span
            key={i}
            className={styles.particle}
            style={{
              left: `${left}%`, width: size, height: size,
              "--particle-duration": `${duration}s`,
              "--particle-delay": `${delay}s`,
              "--particle-drift": `${drift}px`,
            } as CSSProperties}
          />
        ))}
      </div>
      <div className={`${styles.heroContent} relative z-10 flex flex-col items-center`}>
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#6F805A]">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <div className={`${styles.scriptFont} mt-8 text-[56px] leading-[.92] text-[#6F805A]`}>
          <p>{first}</p>
          <p className="my-2 text-4xl text-[#AC8D44]">&amp;</p>
          <p>{second ?? "Hari"}</p>
        </div>
        {p.divider_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.divider_image} alt="" className="mt-8 h-5 w-28 object-contain" />
        ) : null}
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-[#3A443D]">
          {formatEventDate(p.event_date) || "Sabtu, 27 Januari 2024"}
        </p>
      </div>
    </section>
  );
}
