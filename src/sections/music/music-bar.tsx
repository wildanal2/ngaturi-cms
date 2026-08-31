"use client";

import { Pause, Play } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { Sleeve, usePlayer, type MusicProps } from "./shared";

/** Floating mini-player: cover, title, toggle. */
export function MusicBar({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay, p.start_at ?? 0);
  const spinning = playing || Boolean(inCanvas);
  if (!p.audio_url && !inCanvas) return null;

  return (
    <div
      className={
        inCanvas
          ? "mx-auto w-[88%] max-w-sm"
          : "fixed inset-x-0 bottom-16 z-40 mx-auto max-w-sm px-3"
      }
    >
      {p.audio_url ? <audio ref={ref} src={p.audio_url} preload="none" /> : null}
      <div className="flex items-center gap-3 rounded-full bg-ink/85 py-1.5 pl-1.5 pr-3 text-white shadow-lg backdrop-blur">
        <Sleeve cover={p.cover_url} playing={spinning} size={36} />
        <span className="min-w-0 flex-1 truncate text-xs">
          {p.track_title ?? "Musik latar"}
          {p.track_artist ? <span className="opacity-60"> · {p.track_artist}</span> : null}
        </span>
        <button
          onClick={toggle}
          aria-label={playing ? "Jeda" : "Putar"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  );
}
