"use client";

import type { CSSProperties } from "react";
import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import { Expired, UNITS, useCountdown } from "./use-countdown";
import styles from "./countdown-rings.module.css";

const MAX = { d: 365, h: 24, m: 60, s: 60 } as const;

/** Circular conic-gradient progress rings. */
export function CountdownRings({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; message_expired?: string };
  const t = useCountdown(p.target_date);
  return (
    <SectionShell>
      <SectionTitle>Hitung Mundur</SectionTitle>
      {!t ? (
        <div className="h-24" />
      ) : t.done ? (
        <Expired msg={p.message_expired} />
      ) : (
        <div className="inv-stagger flex flex-wrap justify-center gap-4">
          {UNITS.map(([label, k]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className={styles.ring}
                style={
                  { "--pct": Math.min(100, (t[k] / MAX[k]) * 100) } as CSSProperties
                }
              >
                <div className={styles.inner}>
                  {String(t[k]).padStart(2, "0")}
                </div>
              </div>
              <span className={styles.label}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
