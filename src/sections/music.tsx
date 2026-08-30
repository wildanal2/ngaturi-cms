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

function usePlayer(url?: string, isPreview?: boolean, autoplay = true) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a || isPreview) return;
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
  }, [isPreview, autoplay]);

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

const posClass = (p?: string) =>
  p === "left" ? "left-4" : "right-4";

function CanvasHint({ p, label }: { p: MusicProps; label: string }) {
  return (
    <div className="px-6 py-4 text-center text-xs text-[var(--inv-ink)] opacity-60">
      {p.audio_url
        ? `🎵 ${label} aktif${p.track_title ? ` — ${p.track_title}` : ""} (tampil di undangan)`
        : `🎵 ${label} — pilih lagu di panel editor`}
    </div>
  );
}

const spin = "[animation:spin_5s_linear_infinite]";

/* ---------- 1. DISC — floating spinning record button ---------- */
export function MusicDisc({ props, isPreview, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(p.audio_url, isPreview, p.autoplay);
  if (inCanvas) return <CanvasHint p={p} label="Piringan musik" />;
  if (!p.audio_url) return null;

  return (
    <>
      <audio ref={ref} src={p.audio_url} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className={`fixed bottom-24 ${posClass(p.s_position)} z-40 grid h-14 w-14 place-items-center rounded-full bg-ink/85 shadow-lg backdrop-blur`}
      >
        <span
          className={`grid h-11 w-11 place-items-center overflow-hidden rounded-full border-2 border-white/30 ${
            playing ? spin : ""
          }`}
        >
          {p.cover_url ? (
            <Image
              src={p.cover_url}
              alt=""
              width={44}
              height={44}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--inv-primary)] to-[var(--inv-secondary)] text-white">
              <Music size={16} />
            </span>
          )}
          <span className="absolute h-2.5 w-2.5 rounded-full bg-white/80" />
        </span>
        {!playing ? (
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink">
            <Play size={11} className="translate-x-[1px]" />
          </span>
        ) : null}
      </button>
    </>
  );
}

/* ---------- 2. VINYL — inline "piringan hitam" turntable ---------- */
export function MusicVinyl({ props, isPreview, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(p.audio_url, isPreview, p.autoplay);

  return (
    <section className="px-6 py-14">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] p-6 text-center">
        <div className="relative h-44 w-44">
          <div
            className={`h-full w-full rounded-full bg-[radial-gradient(circle,#2a2a2a_0%,#111_38%,#2a2a2a_40%,#111_100%)] ${
              playing && !inCanvas ? "[animation:spin_4s_linear_infinite]" : ""
            }`}
          >
            <div className="absolute inset-[30%] overflow-hidden rounded-full border-2 border-white/10">
              {p.cover_url ? (
                <Image
                  src={p.cover_url}
                  alt=""
                  width={72}
                  height={72}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="grid h-full w-full place-items-center bg-[var(--inv-primary)] text-white">
                  <Music size={18} />
                </span>
              )}
            </div>
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
          </div>
          {/* tonearm */}
          <div
            className={`absolute -right-2 -top-2 h-24 w-1.5 origin-top rounded bg-[var(--inv-ink)] transition-transform ${
              playing ? "rotate-[18deg]" : "rotate-[2deg]"
            }`}
          />
        </div>
        <div>
          <p className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
            {p.track_title ?? "Musik Latar"}
          </p>
          {p.track_artist ? (
            <p className="text-sm text-[var(--inv-ink)] opacity-75">
              {p.track_artist}
            </p>
          ) : null}
        </div>
        {inCanvas ? null : p.audio_url ? (
          <>
            <audio ref={ref} src={p.audio_url} loop preload="none" />
            <button
              onClick={toggle}
              className="rounded-full bg-[var(--inv-primary)] px-5 py-2 text-sm text-white"
            >
              {playing ? "Jeda" : "Putar"}
            </button>
          </>
        ) : (
          <p className="text-xs text-[var(--inv-ink)] opacity-60">
            Pilih lagu di panel editor
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- 3. BAR — floating bottom mini-player ---------- */
export function MusicBar({ props, isPreview, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(p.audio_url, isPreview, p.autoplay);
  if (inCanvas) return <CanvasHint p={p} label="Bar musik" />;
  if (!p.audio_url) return null;

  return (
    <>
      <audio ref={ref} src={p.audio_url} loop preload="none" />
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-sm px-3">
        <div className="flex items-center gap-3 rounded-full bg-ink/85 py-1.5 pl-1.5 pr-3 text-white shadow-lg backdrop-blur">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full ${
              playing ? spin : ""
            }`}
          >
            {p.cover_url ? (
              <Image
                src={p.cover_url}
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--inv-primary)] to-[var(--inv-secondary)]">
                <Music size={14} />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs">
            {p.track_title ?? "Musik latar"}
            {p.track_artist ? (
              <span className="opacity-60"> · {p.track_artist}</span>
            ) : null}
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
    </>
  );
}

/* ---------- 4. PILL — compact floating pill ---------- */
export function MusicPill({ props, isPreview, inCanvas }: SectionRenderProps) {
  const p = props as MusicProps;
  const { ref, playing, toggle } = usePlayer(p.audio_url, isPreview, p.autoplay);
  if (inCanvas) return <CanvasHint p={p} label="Tombol musik" />;
  if (!p.audio_url) return null;

  return (
    <>
      <audio ref={ref} src={p.audio_url} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className={`fixed bottom-20 ${posClass(p.s_position)} z-40 flex items-center gap-2 rounded-full bg-black/70 py-2 pl-2.5 pr-3 text-xs text-white shadow-lg backdrop-blur`}
      >
        {playing ? (
          <Pause size={14} />
        ) : (
          <Music size={14} className="animate-pulse" />
        )}
        {p.track_title ? (
          <span className="max-w-28 truncate">{p.track_title}</span>
        ) : null}
      </button>
    </>
  );
}
