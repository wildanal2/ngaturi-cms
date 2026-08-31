"use client";

import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import Image from "next/image";

export type MusicProps = {
  audio_url?: string;
  track_id?: string;
  track_title?: string;
  track_artist?: string;
  cover_url?: string;
  autoplay?: boolean;
  start_at?: number;
  s_position?: string;
};

export const spinSlow = "[animation:spin_4.5s_linear_infinite]";

/** Audio playback state shared by every music variant. Autoplays on the
 *  `ngaturi:open` event; seeks to / loops from `startAt` (the "reff"). */
export function usePlayer(canControl?: boolean, autoplay = true, startAt = 0) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a || !canControl) return;
    a.volume = 0.55;

    const seekStart = () => {
      if (startAt > 0 && a.currentTime < 1) {
        try {
          a.currentTime = Math.min(startAt, (a.duration || startAt + 1) - 0.5);
        } catch {}
      }
    };
    const onLoop = () => {
      a.currentTime = startAt;
      void a.play();
    };
    a.addEventListener("loadedmetadata", seekStart);
    a.addEventListener("ended", onLoop);

    const onOpen = () => {
      if (!autoplay) return;
      seekStart();
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
      a.removeEventListener("loadedmetadata", seekStart);
      a.removeEventListener("ended", onLoop);
    };
  }, [canControl, autoplay, startAt]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      if (startAt > 0 && a.currentTime < 1) {
        try {
          a.currentTime = startAt;
        } catch {}
      }
      a.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  return { ref, playing, toggle };
}

/** Floating shell — fixed on the real page, inline (over the frame) in builder. */
export function Fab({
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

/** Spinning cover-art disc. */
export function Sleeve({
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
