"use client";

import { useEffect, useState } from "react";
import type { SectionRenderProps } from "./types";
import { SectionShell, SectionTitle } from "./shared";
import styles from "./countdown.module.css";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms / 3_600_000) % 24),
    m: Math.floor((ms / 60_000) % 60),
    s: Math.floor((ms / 1000) % 60),
    done: ms === 0,
  };
}

function useCountdown(targetIso?: string) {
  const target = targetIso ? new Date(targetIso).getTime() : 0;
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);
  useEffect(() => {
    const tick = () => setT(diff(target || Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

const UNITS = [
  ["Hari", "d"],
  ["Jam", "h"],
  ["Menit", "m"],
  ["Detik", "s"],
] as const;

function Expired({ msg }: { msg?: string }) {
  return (
    <p className="text-center text-[var(--inv-ink)]">
      {msg ?? "Acara telah berlangsung"}
    </p>
  );
}

/* 1. minimal — bordered numbers */
export function CountdownMinimal({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; message_expired?: string };
  const t = useCountdown(p.target_date);
  return (
    <SectionShell>
      <SectionTitle>Menghitung Hari</SectionTitle>
      {!t ? (
        <div className="h-24" />
      ) : t.done ? (
        <Expired msg={p.message_expired} />
      ) : (
        <div className="inv-stagger grid grid-cols-4 gap-3 text-center">
          {UNITS.map(([label, k]) => (
            <div
              key={label}
              className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] py-4"
            >
              <div className="font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-primary)]">
                {String(t[k]).padStart(2, "0")}
              </div>
              <div className="text-xs tracking-wide text-[var(--inv-ink)] uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

/* 2. flip — flip-clock cards (CSS module).
   `key` on the card remounts it whenever the digit changes, replaying the
   CSS flip animation. Unchanged digits keep the same key → no replay. */
function FlipCard({ value }: { value: number }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className={styles.flipScene}>
      <div key={text} className={`${styles.flipCard} ${styles.flipping}`}>
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
            <div key={label} className={styles.flipUnit}>
              <FlipCard value={t[k]} />
              <span className={styles.flipLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

/* 3. rings — circular progress (CSS module conic-gradient) */
export function CountdownRings({ props }: SectionRenderProps) {
  const p = props as { target_date?: string; message_expired?: string };
  const t = useCountdown(p.target_date);
  const max = { d: 365, h: 24, m: 60, s: 60 };
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
                  {
                    "--pct": Math.min(
                      100,
                      (t[k] / max[k]) * 100,
                    ),
                  } as React.CSSProperties
                }
              >
                <div className={styles.ringInner}>
                  {String(t[k]).padStart(2, "0")}
                </div>
              </div>
              <span className={styles.flipLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

/* 4. pill — one compact line */
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

/* 5. elegant — large serif numbers, dot separators */
export function CountdownElegant({ props }: SectionRenderProps) {
  const p = props as {
    target_date?: string;
    message_expired?: string;
    s_sep?: string;
  };
  const t = useCountdown(p.target_date);
  const showSep = p.s_sep !== "none";
  return (
    <SectionShell muted>
      {!t ? (
        <div className="h-20" />
      ) : t.done ? (
        <Expired msg={p.message_expired} />
      ) : (
        <div className="flex items-center justify-center gap-2 font-[family-name:var(--inv-font)] text-[var(--inv-primary)]">
          {UNITS.map(([label, k], i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-4xl">{String(t[k]).padStart(2, "0")}</div>
                <div className="text-[10px] tracking-widest text-[var(--inv-ink)] uppercase">
                  {label}
                </div>
              </div>
              {showSep && i < UNITS.length - 1 ? (
                <span className="pb-4 text-2xl opacity-40">·</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
