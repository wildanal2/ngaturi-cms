"use client";

import type { SectionRenderProps } from "../types";
import { CoverShell, useOpen, type CoverProps } from "./shell";
import { Backdrop, HeritageFrame } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Gerbang heritage; lifecycle buka undangan tetap milik cover existing. */
export function CoverCinematicVintage({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-primary)">
      <div className={styles.cover}>
        <Backdrop />
        <HeritageFrame className={styles.coverFrame}>
          <p className={styles.eyebrow}>{p.tagline ?? "The Wedding Of"}</p>
          <h1>{p.names ?? "Nama Mempelai"}</h1>
          <div className={styles.rule} />
          <p>{p.note ?? "Kepada Bapak/Ibu/Saudara/i"}</p>
          <p className="mt-2 text-lg">{guestName}</p>
          <button className={styles.button} onClick={reveal}>
            {p.button_label ?? "Buka Undangan"}
          </button>
        </HeritageFrame>
      </div>
    </CoverShell>
  );
}
