"use client";

import { Pause, Play } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { Fab, usePlayer, type MusicProps } from "./shared";
import { serambiTheme } from "../serambi-delima/primitives";
import styles from "../serambi-delima/phase-four.module.css";

/** Presentation only: the existing player owns opening, seek, loop and pause. */
export function MusicSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay, p.start_at ?? 0);
  if (!p.audio_url && !inCanvas) return null;
  const label = `${playing ? "Jeda musik" : "Putar musik"}${p.track_title ? `: ${p.track_title}` : ""}`;
  return (
    <div
      className={`${serambiTheme} ${styles.musicTheme}`}
      data-floating={!inCanvas}
      data-side={p.s_position === "left" ? "left" : "right"}
    >
      <Fab inCanvas={inCanvas} position={p.s_position} bottom="bottom-4">
        {p.audio_url ? (
          <audio ref={ref} src={p.audio_url} preload="none" />
        ) : null}
        <button
          type="button"
          onClick={toggle}
          disabled={!p.audio_url}
          aria-label={label}
          aria-pressed={playing}
          title={label}
          className={styles.musicButton}
        >
          {playing ? (
            <Pause size={20} aria-hidden="true" />
          ) : (
            <Play size={20} aria-hidden="true" />
          )}
        </button>
      </Fab>
    </div>
  );
}
