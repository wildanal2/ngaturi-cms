"use client";

import type { SectionRenderProps } from "../types";
import { SectionShell } from "../shared";
import { Expired, UNITS, useCountdown } from "./use-countdown";

/** Large serif numbers with optional dot separators. */
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
