import type { SectionRenderProps } from "../types";
import styles from "../sekar-jawa-3d/sekar-jawa-3d.module.css";
import { JasmineOrnament } from "../sekar-jawa-3d/jasmine-ornament";

/** Restrained sign-off placed before the procedural Pelaminan. */
export function ClosingSekarJawa3D({ props }: SectionRenderProps) {
  const p = props as { message?: string; names?: string };
  return (
    <section className={styles.royalClosing}>
      <div data-ceremony-reveal="100">
        <JasmineOrnament className={styles.jasmineOrnament} />
      </div>
      <p
        data-ceremony-reveal="240"
        className="text-xs tracking-[0.32em] text-[var(--inv-secondary)] uppercase"
      >
        Matur Nuwun
      </p>
      <p
        data-ceremony-reveal="380"
        className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-[var(--inv-ink)]"
      >
        {p.message ?? "Terima kasih atas doa dan restu yang diberikan."}
      </p>
      <p
        data-ceremony-reveal="560"
        className={`${styles.closingNames} mt-7 font-[family-name:var(--inv-font)] text-[var(--inv-primary)]`}
      >
        {p.names ?? "Nama Mempelai"}
      </p>
    </section>
  );
}
