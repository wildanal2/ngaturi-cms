"use client";

import type { SectionRenderProps } from "../types";
import styles from "../sekar-jawa-3d/sekar-jawa-3d.module.css";
import { JasmineOrnament } from "../sekar-jawa-3d/jasmine-ornament";
import {
  Body,
  CoverShell,
  OpenButton,
  useOpen,
  type CoverProps,
} from "./shell";

/** Transparent ceremonial gate overlay that leaves the R3F world visible. */
export function CoverSekarJawa3D({
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
      <div className={styles.coverPanel}>
        <JasmineOrnament className={styles.jasmineOrnament} />
        <Body p={p} guestName={guestName} />
        <OpenButton label={p.button_label} onClick={reveal} />
      </div>
    </CoverShell>
  );
}
