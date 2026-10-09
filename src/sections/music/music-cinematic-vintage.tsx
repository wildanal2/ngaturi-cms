"use client";

import { Pause, Play } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { usePlayer, Sleeve, type MusicProps } from "./shared";
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
  if (!p.audio_url && !inCanvas) return null;
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
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        aria-pressed={playing}
        className={styles.musicButton}
      >
        <span className={styles.record}>
          <Sleeve
            playing={playing}
            size={38}
            spinSeconds={p.spin_seconds ?? 16}
          />
        </span>
        <span className={styles.musicGlyph}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </span>
      </button>
    </div>
  );
}
