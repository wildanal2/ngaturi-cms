"use client";

import type { SectionRenderProps } from "../types";
import {
  Body,
  CoverShell,
  OpenButton,
  Photo,
  overlayVal,
  useOpen,
  type CoverProps,
} from "./shell";

/** Photo fills the screen, text pinned to a chosen position. */
export function CoverPhoto({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  const align =
    p.s_align === "top" ? "top" : p.s_align === "bottom" ? "bottom" : "center";
  return (
    <CoverShell inCanvas={inCanvas} open={open} align={align}>
      <Photo src={p.background_image} opacity={overlayVal(p.s_overlay)} />
      <Body p={p} guestName={guestName} />
      <OpenButton label={p.button_label} onClick={reveal} />
    </CoverShell>
  );
}
