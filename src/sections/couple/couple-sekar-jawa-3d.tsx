import Image from "next/image";
import type { SectionRenderProps } from "../types";
import type { Person } from "./person";
import styles from "../sekar-jawa-3d/sekar-jawa-3d.module.css";

function RoyalPortrait({ person, delay }: { person?: Person; delay: number }) {
  return (
    <div className={`${styles.royalPerson} text-center`}>
      <div
        data-ceremony-reveal={delay}
        className={`${styles.royalPortrait} relative mx-auto aspect-[4/5] overflow-hidden rounded-t-full border-2 border-[var(--inv-secondary)]`}
      >
        {person?.photo ? (
          <Image
            src={person.photo}
            alt={person.name ?? ""}
            fill
            sizes="(max-width: 420px) 112px, 144px"
            className="object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center font-[family-name:var(--inv-font)] text-4xl text-[var(--inv-primary)]"
            aria-hidden="true"
          >
            {(person?.name || person?.full_name || "").slice(0, 1)}
          </span>
        )}
      </div>
      <h3
        data-ceremony-reveal={delay + 140}
        className={`${styles.royalName} font-[family-name:var(--inv-font)] text-[var(--inv-primary)]`}
      >
        {person?.full_name || person?.name || "Nama Mempelai"}
      </h3>
      <p
        data-ceremony-reveal={delay + 280}
        className={`${styles.royalOrigin} mt-1 text-xs leading-relaxed text-[var(--inv-ink)]`}
      >
        {[person?.child_order, person?.parents].filter(Boolean).join(" ")}
      </p>
    </div>
  );
}

/** Paired royal portraits for the Pendopo journey stop. */
export function CoupleSekarJawa3D({ props }: SectionRenderProps) {
  const p = props as { title?: string; bride?: Person; groom?: Person };
  return (
    <section className={styles.royalCoupleSection}>
      <p className="text-center text-xs tracking-[0.3em] text-[var(--inv-secondary)] uppercase">
        {p.title ?? "Mempelai"}
      </p>
      <div className={styles.royalCoupleGrid}>
        <RoyalPortrait person={p.bride} delay={80} />
        <span
          data-ceremony-reveal="240"
          className={`${styles.royalAmpersand} font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]`}
        >
          &amp;
        </span>
        <RoyalPortrait person={p.groom} delay={180} />
      </div>
    </section>
  );
}
