"use client";

import { CalendarPlus } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { FloatingLeaves } from "../ornaments";
import { Expired, UNITS, useCountdown } from "./use-countdown";

/**
 * "Save the Date" — bold numbers in a row, an add-to-calendar link, and
 * swaying botanical corners.
 */
export function CountdownPlain({ props }: SectionRenderProps) {
  const p = props as {
    target_date?: string;
    message_expired?: string;
    calendar_url?: string;
  };
  const t = useCountdown(p.target_date);
  return (
    <section className="relative overflow-hidden px-6 py-16 text-center">
      <FloatingLeaves />
      <div className="relative flex flex-col items-center">
        <p className="font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-primary)]">
          Save The Date
        </p>
        <div className="mt-8">
          {!t ? (
            <div className="h-14" />
          ) : t.done ? (
            <Expired msg={p.message_expired} />
          ) : (
            <div className="flex items-start gap-5 text-[var(--inv-ink)] sm:gap-8">
              {UNITS.map(([label, k]) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-3xl font-extrabold sm:text-4xl">
                    {String(t[k]).padStart(2, "0")}
                  </span>
                  <span className="mt-1 text-[10px] tracking-[0.2em] uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {p.calendar_url ? (
          <a
            href={p.calendar_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--inv-primary)_35%,transparent)] px-4 py-1.5 text-sm text-[var(--inv-ink)]"
          >
            <CalendarPlus size={14} /> Tambah ke Kalender
          </a>
        ) : null}
      </div>
    </section>
  );
}
