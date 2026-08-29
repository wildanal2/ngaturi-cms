"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

export function MusicPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.6;

    function tryPlay() {
      audio
        ?.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
    window.addEventListener("ngaturi:open", tryPlay);
    return () => window.removeEventListener("ngaturi:open", tryPlay);
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="fixed right-4 bottom-4 z-40 grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur"
      >
        {playing ? (
          <Pause size={18} />
        ) : (
          <Music size={18} className="animate-pulse" />
        )}
      </button>
    </>
  );
}
