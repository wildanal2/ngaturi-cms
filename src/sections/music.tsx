"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play } from "lucide-react";
import Image from "next/image";
import type { SectionRenderProps } from "./types";

type MusicProps = {
  audio_url?: string;
  track_id?: string;
  track_title?: string;
  track_artist?: string;
  cover_url?: string;
  autoplay?: boolean;
  s_position?: string;
};

function usePlayer(canControl?: boolean, autoplay = true) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a || !canControl) return;
    a.volume = 0.55;
    const onOpen = () => {
      if (!autoplay) return;
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };
    window.addEventListener("ngaturi:open", onOpen);
    const sync = () => setPlaying(!a.paused);
    a.addEventListener("play", sync);
    a.addEventListener("pause", sync);
    return () => {
      window.removeEventListener("ngaturi:open", onOpen);
      a.removeEventListener("play", sync);
      a.removeEventListener("pause", sync);
    };
  }, [canControl, autoplay]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else {
      a.pause();
      setPlaying(false);
    }
  };

  return { ref, playing, toggle };
}

const spinSlow = "[animation:spin_4.5s_linear_infinite]";

/** floating shell — fixed on the real page, sticky inside the builder frame */
function Fab({
  inCanvas,
  position,
  bottom = "bottom-20",
  children,
}: {
  inCanvas?: boolean;
  position?: string;
  bottom?: string;
  children: React.ReactNode;
}) {
  const side = position === "left" ? "left-4" : "right-4";
  return (
    <div
      className={
        inCanvas
          ? `pointer-events-auto flex w-max px-4 ${
              position === "left" ? "" : "ml-auto"
            }`
          : `fixed ${bottom} ${side} z-40`
      }
    >
      {children}
    </div>
  );
}

function Hint({ label }: { label: string }) {
  return (
    <div className="px-6 py-3 text-center text-xs text-[var(--inv-ink)] opacity-60">
      🎵 {label} — pilih lagu di panel editor
    </div>
  );
}

function Sleeve({
  cover,
  playing,
  size,
}: {
  cover?: string;
  playing: boolean;
  size: number;
}) {
  return (
    <span
      className={`relative grid place-items-center overflow-hidden rounded-full ${playing ? spinSlow : ""}`}
      style={{ width: size, height: size }}
    >
      {cover ? (
        <Image
          src={cover}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--inv-primary)] to-[var(--inv-secondary)] text-white">
          <Music size={size * 0.32} />
        </span>
      )}
      <span
        className="absolute rounded-full bg-white/85 ring-2 ring-black/20"
        style={{ width: size * 0.18, height: size * 0.18 }}
      />
    </span>
  );
}

/* ---------- 1. DISC — cover art record ---------- */
export function MusicDisc({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay);
  const spinning = playing || Boolean(inCanvas);
  if (!p.audio_url) return inCanvas ? <Hint label="Piringan musik" /> : null;

  return (
    <Fab inCanvas={inCanvas} position={p.s_position} bottom="bottom-24">
      <audio ref={ref} src={p.audio_url} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-ink/85 shadow-lg backdrop-blur"
      >
        <span className="rounded-full border-2 border-white/25 p-0.5">
          <Sleeve cover={p.cover_url} playing={spinning} size={44} />
        </span>
        <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink">
          {playing ? <Pause size={11} /> : <Play size={11} className="translate-x-[1px]" />}
        </span>
      </button>
    </Fab>
  );
}

/* ---------- 2. VINYL — floating turntable FAB (piringan hitam) ---------- */
export function MusicVinyl({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay);
  const spinning = playing || Boolean(inCanvas);
  if (!p.audio_url) return inCanvas ? <Hint label="Piringan hitam" /> : null;

  return (
    <Fab inCanvas={inCanvas} position={p.s_position} bottom="bottom-24">
      <audio ref={ref} src={p.audio_url} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="relative h-16 w-16 drop-shadow-xl"
      >
        {/* the record */}
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
        {/* tonearm */}
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

/* ---------- 3. BAR — floating mini-player ---------- */
export function MusicBar({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay);
  const spinning = playing || Boolean(inCanvas);
  if (!p.audio_url) return inCanvas ? <Hint label="Bar musik" /> : null;

  return (
    <div
      className={
        inCanvas
          ? "mx-auto w-[88%] max-w-sm"
          : "fixed inset-x-0 bottom-16 z-40 mx-auto max-w-sm px-3"
      }
    >
      <audio ref={ref} src={p.audio_url} loop preload="none" />
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

/* ---------- 4. PILL — compact ---------- */
export function MusicPill({ props, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(true, p.autoplay);
  if (!p.audio_url) return inCanvas ? <Hint label="Tombol musik" /> : null;

  return (
    <Fab inCanvas={inCanvas} position={p.s_position} bottom="bottom-20">
      <audio ref={ref} src={p.audio_url} loop preload="none" />
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
