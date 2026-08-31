"use client";

import type { SectionRenderProps } from "../types";
import { CornerFloral, TopGarland } from "../ornaments";
import {
  Body,
  CoverShell,
  OpenButton,
  useOpen,
  type CoverProps,
} from "./shell";

/** Ornaments + framed round photo. */
export function CoverBotanical({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-primary)">
      <TopGarland className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full text-[var(--inv-secondary)] opacity-70" />
      <CornerFloral className="inv-ornament inv-ornament--slow pointer-events-none absolute -bottom-6 -left-8 h-48 w-48 text-[var(--inv-secondary)] opacity-80" />
      <CornerFloral className="inv-ornament inv-ornament--flip pointer-events-none absolute -right-8 -bottom-6 h-48 w-48 text-[var(--inv-secondary)] opacity-80" />
      {p.background_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.background_image}
          alt=""
          className="relative mb-6 h-56 w-44 rounded-full border-4 border-white/60 object-cover"
        />
      ) : null}
      <Body p={p} guestName={guestName} />
      <OpenButton label={p.button_label} onClick={reveal} />
    </CoverShell>
  );
}
