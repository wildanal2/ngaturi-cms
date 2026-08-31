"use client";

import { Music, Pause, Play } from "lucide-react";
import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { Fab, spinSlow, usePlayer, type MusicProps } from "./shared";

/** Floating turntable FAB (piringan hitam). */
export function MusicVinyl({ props, inCanvas }: SectionRenderProps) {
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
        className="relative h-16 w-16 drop-shadow-xl"
      >
        <span
          className={`block h-16 w-16 rounded-full bg-[radial-gradient(circle,#2b2b2b_0%,#111_34%,#333_37%,#111_46%,#2b2b2b_49%,#111_58%,#333_62%,#111_100%)] ${spinning ? spinSlow : ""}`}
        >
          <span className="absolute inset-[34%] overflow-hidden rounded-full border border-white/10">
            {p.cover_url ? (
              <Image
                src={p.cover_url}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="grid h-full w-full place-items-center bg-[var(--inv-primary)] text-white">
                <Music size={12} />
              </span>
            )}
          </span>
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
        </span>
        <span
          className={`absolute -right-1 -top-1 h-9 w-1.5 origin-top rounded bg-ink transition-transform duration-500 ${
            playing ? "rotate-[24deg]" : "rotate-[2deg]"
          }`}
        />
        <span className="absolute -bottom-1 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-white text-ink shadow">
          {playing ? <Pause size={11} /> : <Play size={11} className="translate-x-[1px]" />}
        </span>
      </button>
    </Fab>
  );
}
