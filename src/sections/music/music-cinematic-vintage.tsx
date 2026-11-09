"use client";

import { Music2, VolumeX } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { usePlayer, type MusicProps } from "./shared";
import styles from "../cinematic/cinematic.module.css";

export function MusicCinematicVintage({
  props,
  inCanvas,
  isPreview,
}: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(
    true,
    !isPreview && (p.autoplay ?? true),
    p.start_at ?? 0,
  );
  if (!p.audio_url) return null;
  return (
    <div
      className={styles.musicControl}
      data-in-canvas={inCanvas || undefined}
      data-side={p.s_position}
    >
      {p.audio_url ? (
        <audio data-loading-audio ref={ref} src={p.audio_url} preload="none" />
      ) : null}
      <button
        type="button"
        onClick={toggle}
        disabled={!p.audio_url}
        aria-label={
          playing ? "Matikan musik · Musik aktif" : "Putar musik · Musik mati"
        }
        aria-pressed={playing}
        className={styles.musicButton}
      >
        {playing ? (
          <Music2 size={20} aria-hidden="true" />
        ) : (
          <VolumeX size={20} aria-hidden="true" />
        )}
      </button>
      <span className={styles.musicStatus} role="status">
        {playing ? "Musik aktif" : "Musik mati"}
      </span>
    </div>
  );
}
