"use client";

import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import { Expired, UNITS, useCountdown } from "./use-countdown";
import styles from "./countdown-flip.module.css";

/* `key` on the card remounts it whenever the digit changes, replaying the
   CSS flip animation. Unchanged digits keep the same key → no replay. */
function FlipCard({ value }: { value: number }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className={styles.scene}>
      <div key={text} className={`${styles.card} ${styles.flipping}`}>
        {text}
      </div>
    </div>
  );
}

export function CountdownFlip({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; message_expired?: string };
  const t = useCountdown(p.target_date);
  return (
    <SectionShell muted>
      <SectionTitle>Menuju Hari Bahagia</SectionTitle>
      {!t ? (
        <div className="h-24" />
      ) : t.done ? (
        <Expired msg={p.message_expired} />
      ) : (
        <div className="inv-stagger flex justify-center gap-3">
          {UNITS.map(([label, k]) => (
            <div key={label} className={styles.unit}>
              <FlipCard value={t[k]} />
              <span className={styles.label}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
