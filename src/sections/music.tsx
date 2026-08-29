"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";
import type { SectionRenderProps } from "./types";

/**
 * Music section — renders a floating play/pause button. Placement in the
 * section list doesn't matter (the control is position: fixed). Autoplays
 * when the guest taps "Buka Undangan" on the cover.
 */
export function MusicSection({ props, isPreview, inCanvas }: SectionRenderProps) {
  const p = props as {
    audio_url?: string;
    title?: string;
    artist?: string;
    autoplay?: boolean;
  };
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isPreview) return;
    audio.volume = 0.6;
    const tryPlay = () =>
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setNudge(true));
    window.addEventListener("ngaturi:open", tryPlay);
    return () => window.removeEventListener("ngaturi:open", tryPlay);
  }, [isPreview]);

  if (inCanvas) {
    return (
      <div className="px-6 py-4 text-center text-xs text-[var(--inv-ink)] opacity-60">
        {p.audio_url
          ? `🎵 Musik latar aktif${p.title ? ` — ${p.title}` : ""} (tombol muncul di undangan)`
          : "🎵 Musik latar — isi URL audio di panel editor."}
      </div>
    );
  }

  if (!p.audio_url) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
      setNudge(false);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={p.audio_url} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className={`fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full bg-black/70 py-2 pr-3 pl-2.5 text-xs text-white shadow-lg backdrop-blur ${
          nudge ? "animate-pulse" : ""
        }`}
      >
        <span className="grid h-6 w-6 place-items-center">
          {playing ? (
            <Pause size={14} />
          ) : (
            <Music size={14} className={playing ? "" : "animate-pulse"} />
          )}
        </span>
        {p.title ? <span className="max-w-28 truncate">{p.title}</span> : null}
      </button>
    </>
  );
}
