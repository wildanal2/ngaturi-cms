"use client";

import { Pause, Play } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { Fab, Sleeve, usePlayer, type MusicProps } from "./shared";

/** Round button with spinning cover-art record. */
export function MusicDisc({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay, p.start_at ?? 0);
  const spinning = playing || Boolean(inCanvas);
  if (!p.audio_url && !inCanvas) return null;

  return (
    <Fab inCanvas={inCanvas} position={p.s_position} bottom="bottom-24">
      {p.audio_url ? <audio ref={ref} src={p.audio_url} preload="none" /> : null}
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-ink/85 shadow-lg backdrop-blur"
      >
        <span className="rounded-full border-2 border-white/25 p-0.5">
          <Sleeve
            cover={p.cover_url}
            playing={spinning}
            size={44}
            spinSeconds={p.spin_seconds}
          />
        </span>
        <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink">
          {playing ? <Pause size={11} /> : <Play size={11} className="translate-x-[1px]" />}
        </span>
      </button>
    </Fab>
  );
}
