import Image from "next/image";
import type { SectionRenderProps } from "../types";
import type { Person } from "./person";
import styles from "../enchanted-garden/enchanted-garden.module.css";

function RoyalPortrait({ person }: { person?: Person }) {
  return (
    <div className={`${styles.royalPerson} text-center`}>
      <div
        className={`${styles.royalPortrait} relative mx-auto aspect-[4/5] overflow-hidden rounded-t-full border-2 border-[var(--inv-secondary)]`}
      >
        {person?.photo ? (
          <Image
            src={person.photo}
            alt={person.name ?? ""}
            fill
            className="object-cover"
          />
        ) : null}
      </div>
      <h3
        className={`${styles.royalName} font-[family-name:var(--inv-font)] text-[var(--inv-primary)]`}
      >
        {person?.full_name || person?.name || "Nama Mempelai"}
      </h3>
      <p
        className={`${styles.royalOrigin} mt-1 text-xs leading-relaxed text-[var(--inv-ink)]`}
      >
        {[person?.child_order, person?.parents].filter(Boolean).join(" ")}
      </p>
    </div>
  );
}

/** Paired royal portraits for the Pendopo journey stop. */
export function CoupleEnchantedGarden({ props }: SectionRenderProps) {
  const p = props as { title?: string; bride?: Person; groom?: Person };
  return (
    <section className={styles.royalCoupleSection}>
      <p className="text-center text-xs tracking-[0.3em] text-[var(--inv-secondary)] uppercase">
        {p.title ?? "Mempelai"}
      </p>
      <div className={styles.royalCoupleGrid}>
        <RoyalPortrait person={p.bride} />
        <span
          className={`${styles.royalAmpersand} font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]`}
        >
          &amp;
        </span>
        <RoyalPortrait person={p.groom} />
      </div>
    </section>
  );
}
