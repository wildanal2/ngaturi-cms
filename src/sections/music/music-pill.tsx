"use client";

import { Music, Pause } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { Fab, usePlayer, type MusicProps } from "./shared";

/** Compact corner button. */
export function MusicPill({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay, p.start_at ?? 0);
  if (!p.audio_url && !inCanvas) return null;

  return (
    <Fab inCanvas={inCanvas} position={p.s_position} bottom="bottom-20">
      {p.audio_url ? <audio ref={ref} src={p.audio_url} preload="none" /> : null}
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="flex items-center gap-2 rounded-full bg-black/70 py-2 pl-2.5 pr-3 text-xs text-white shadow-lg backdrop-blur"
      >
        {playing ? <Pause size={14} /> : <Music size={14} className="animate-pulse" />}
        {p.track_title ? <span className="max-w-28 truncate">{p.track_title}</span> : null}
      </button>
    </Fab>
  );
}
