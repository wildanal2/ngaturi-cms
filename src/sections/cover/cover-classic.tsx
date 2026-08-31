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

/** Solid colour / photo, text centred. */
export function CoverClassic({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open}>
      <Photo src={p.background_image} opacity={overlayVal(p.s_overlay)} />
      <Body p={p} guestName={guestName} />
      <OpenButton label={p.button_label} onClick={reveal} />
    </CoverShell>
  );
}
