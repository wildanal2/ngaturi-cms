"use client";

import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import { Expired, UNITS, useCountdown } from "./use-countdown";

/** Bordered numbers in a 4-column grid. */
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
