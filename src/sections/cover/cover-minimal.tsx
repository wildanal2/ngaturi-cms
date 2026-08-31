"use client";

import type { SectionRenderProps } from "../types";
import { CoverShell, useOpen, type CoverProps } from "./shell";

/** Typographic, no photo. */
export function CoverMinimal({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-bg)">
      <div className="relative text-[var(--inv-primary)]">
        <p className="text-xs tracking-[0.4em] uppercase">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-4 font-[family-name:var(--inv-font)] text-6xl leading-none">
          {p.names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-8 text-sm text-[var(--inv-ink)]">
          {p.note ?? "Kepada Bapak/Ibu/Saudara/i"}
        </p>
        {guestName ? (
          <p className="mt-1 text-lg font-medium text-[var(--inv-ink)]">
            {guestName}
          </p>
        ) : null}
        <button
          onClick={reveal}
          className="mt-10 rounded-full bg-[var(--inv-primary)] px-6 py-2.5 text-sm text-white"
        >
          {p.button_label ?? "Buka Undangan"}
        </button>
      </div>
    </CoverShell>
  );
}
