"use client";

import { MailOpen } from "lucide-react";
import type { SectionRenderProps } from "../types";
import styles from "../floating17.module.css";
import { CoverShell, useOpen } from "./shell";

type Floating17GateProps = {
  names?: string;
  initials?: string;
  event_date?: string;
  tagline?: string;
  note?: string;
  button_label?: string;
  background_image?: string;
  background_desktop_image?: string;
  floral_left_image?: string;
  floral_right_image?: string;
  divider_image?: string;
};

export function CoverFloating17({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as Floating17GateProps;
  const { open, reveal } = useOpen();
  const initials = p.initials ?? (p.names ?? "Hani & Hari")
    .split("&")
    .map((name) => name.trim().charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <CoverShell inCanvas={inCanvas} open={open}>
      <picture className="absolute inset-0">
        {p.background_desktop_image ? (
          <source media="(min-width: 768px)" srcSet={p.background_desktop_image} />
        ) : null}
        {p.background_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.background_image} alt="" className="h-full w-full object-cover" />
        ) : null}
      </picture>
      <span className="absolute inset-0 bg-black/70" />

      <div className={`${styles.bodyFont} ${styles.gateEnter} relative z-10 flex w-full max-w-sm flex-col items-center text-white [text-shadow:0_2px_8px_rgb(0_0_0/.7)]`}>
        <p className="text-sm uppercase tracking-[0.34em] text-[#CEAA4A]">
          {p.tagline ?? "Invitation"}
        </p>

        <div className={`${styles.pulse} relative mt-6 grid h-36 w-52 place-items-center`}>
          {p.floral_left_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.floral_left_image} alt="" className="absolute left-0 top-1/2 h-32 -translate-y-1/2 object-contain" />
          ) : null}
          {p.floral_right_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.floral_right_image} alt="" className="absolute right-0 top-1/2 h-32 -translate-y-1/2 object-contain" />
          ) : null}
          <span className="text-5xl font-semibold tracking-[0.08em] text-[#D3B26B]">{initials}</span>
        </div>

        {p.divider_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.divider_image} alt="" className="mt-1 h-5 w-44 object-contain" />
        ) : null}
        <h1 className="mt-4 text-2xl font-semibold tracking-wide">{p.names ?? "Hani & Hari"}</h1>
        <p className="mt-2 text-sm tracking-[0.18em]">{p.event_date ?? "27 Januari 2024"}</p>
        <div className="mt-8">
          <p className="text-xs opacity-85">{p.note ?? "Kepada Yth. Bapak/Ibu/Saudara/i :"}</p>
          <p className="mt-2 text-lg font-semibold text-[#D3B26B]">{guestName ?? "Tamu Undangan"}</p>
        </div>
        <button
          type="button"
          onClick={reveal}
          className={`${styles.pulse} mt-8 inline-flex items-center gap-2 rounded-full bg-[#CEAA4A] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#D3B26B]`}
        >
          <MailOpen size={16} /> {p.button_label ?? "Buka Undangan"}
        </button>
      </div>
    </CoverShell>
  );
}
