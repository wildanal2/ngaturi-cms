"use client";

import { CalendarPlus } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorOrnaments } from "../shared";
import { Expired, UNITS, useCountdown } from "./use-countdown";

/**
 * "Save the Date" — bold numbers in a row, an add-to-calendar link, and
 * swaying botanical corners. Supports optional save-the-date GIF/image
 * above the timer, plus background texture and layered ornaments.
 */
export function CountdownPlain({ props }: SectionRenderProps) {
  const p = props as {
    target_date?: string;
    message_expired?: string;
    calendar_url?: string;
    save_the_date_image?: string;
    background_image?: string;
    ornament_tr_images?: string[];
    ornament_bl_images?: string[];
  };
  const d = pickDecor(p);
  const t = useCountdown(p.target_date);
  return (
    <section
      className="relative overflow-hidden px-6 py-16 text-center"
      style={decorBgStyle(d)}
    >
      <DecorOrnaments d={d} />
      <div className="relative flex flex-col items-center">
        {p.save_the_date_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.save_the_date_image}
            alt="Save The Date"
            className="mb-6 w-[70%] max-w-[280px]"
          />
        ) : (
          <p className="font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-primary)]">
            Save The Date
          </p>
        )}
        <div className={p.save_the_date_image ? "" : "mt-8"}>
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
