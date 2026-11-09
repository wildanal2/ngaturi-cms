"use client";
import { useEffect, useRef } from "react";
import { mountCinematicViewport } from "./viewport";
export function CinematicViewport({ inCanvas }: { inCanvas?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".cinematic-invitation");
    if (!root) return;
    const scroller = inCanvas
      ? root.closest<HTMLElement>("[data-device-scroller]")
      : null;
    if (inCanvas && !scroller) return;
    return mountCinematicViewport(root, scroller);
  }, [inCanvas]);
  return <span hidden ref={ref} />;
}
