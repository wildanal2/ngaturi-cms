"use client";

import type { SectionRenderProps } from "../types";
import { SectionShell } from "../shared";
import { Expired, useCountdown } from "./use-countdown";
import styles from "./countdown-pill.module.css";

/** One compact line. */
export function CountdownPill({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; message_expired?: string };
  const t = useCountdown(p.target_date);
  return (
    <SectionShell>
      <div className="text-center">
        {!t ? null : t.done ? (
          <Expired msg={p.message_expired} />
        ) : (
          <span className={styles.pill}>
            <span>
              <b>{t.d}</b> hari
            </span>
            <span>
              <b>{String(t.h).padStart(2, "0")}</b> jam
            </span>
            <span>
              <b>{String(t.m).padStart(2, "0")}</b> menit lagi
            </span>
          </span>
        )}
      </div>
    </SectionShell>
  );
}
