"use client";

import { useState } from "react";
import type { SectionRenderProps } from "../types";
import { usePlayer, type MusicProps } from "./shared";
import styles from "./music-gerbang-puspa.module.css";

export function MusicGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const [failed, setFailed] = useState<string>();
  const available = !!p.audio_url && failed !== p.audio_url;
  const { ref, playing, toggle } = usePlayer(
    available,
    p.autoplay,
    p.start_at ?? 0,
  );
  const state = !p.audio_url
    ? "unavailable"
    : failed === p.audio_url
      ? "error"
      : playing
        ? "playing"
        : "paused";
  const label =
    state === "unavailable"
      ? "Musik belum tersedia"
      : state === "error"
        ? "Musik tidak dapat dimuat"
        : playing
          ? "Jeda musik"
          : "Putar musik";
  return (
    <div
      className={`${styles.music} ${inCanvas ? styles.inline : ""}`}
      data-gerbang-puspa-music
    >
      {p.audio_url && (
        <audio
          ref={ref}
          src={p.audio_url}
          preload="none"
          onError={() => setFailed(p.audio_url)}
        />
      )}
      <button
        type="button"
        data-state={state}
        aria-label={label}
        aria-pressed={available && playing}
        title={p.track_title ? `${label}: ${p.track_title}` : label}
        disabled={!available}
        onClick={toggle}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <path d="M3 10h5l7-6v20l-7-6H3z" fill="currentColor" />
          {available && playing ? (
            <path
              d="M19 9v10M24 6v16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="m19 10 6 8m0-8-6 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
