"use client";

import type { SectionRenderProps } from "../types";
import {
  Body,
  CoverShell,
  OpenButton,
  useOpen,
  type CoverProps,
} from "./shell";

/** Transparent ceremonial gate overlay that leaves the R3F world visible. */
export function CoverEnchantedGarden({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();

  return (
    <CoverShell
      inCanvas={inCanvas}
      open={open}
      bg="transparent"
      style={{
        background:
          "radial-gradient(circle at center, color-mix(in srgb, var(--inv-primary) 24%, transparent), color-mix(in srgb, var(--inv-bg) 32%, transparent))",
      }}
    >
      <div className="pointer-events-none absolute inset-6 border border-[color-mix(in_srgb,var(--inv-secondary)_55%,transparent)]" />
      <div className="pointer-events-none absolute inset-9 border border-[color-mix(in_srgb,var(--inv-secondary)_25%,transparent)]" />
      <div className="relative rounded-[2rem] border border-white/15 bg-black/25 px-8 py-10 shadow-2xl backdrop-blur-sm">
        <Body p={p} guestName={guestName} />
        <OpenButton label={p.button_label} onClick={reveal} />
      </div>
    </CoverShell>
  );
}
