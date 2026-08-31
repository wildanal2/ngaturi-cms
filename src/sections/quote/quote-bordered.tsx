import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorOrnaments } from "../shared";
import styles from "./quote.module.css";

/** Bordered quote — optional background texture and leaf ornaments. */
export function QuoteBordered({ props }: SectionRenderProps) {
  const p = props as {
    text?: string;
    source?: string;
    background_image?: string;
    ornament_tr_images?: string[];
    ornament_bl_images?: string[];
  };
  const d = pickDecor(p);
  const hasBg = !!d.background_image;
  return (
    <section
      className={`relative overflow-hidden px-6 py-16 ${
        hasBg ? "" : "bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)]"
      }`}
      style={decorBgStyle(d)}
    >
      {hasBg ? <DecorOrnaments d={d} /> : null}
      <div className="relative mx-auto max-w-xl text-center">
        <p className={styles.hairline + " mx-auto mb-5 max-w-[120px]"} />
        <p className="font-[family-name:var(--inv-font)] text-lg leading-relaxed text-[var(--inv-primary)]">
          {p.text}
        </p>
        {p.source ? (
          <p className="mt-3 text-sm text-[var(--inv-ink)]">— {p.source}</p>
        ) : null}
        <p className={styles.hairline + " mx-auto mt-5 max-w-[120px]"} />
      </div>
    </section>
  );
}
