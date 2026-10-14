"use client";

import { useEffect, useRef } from "react";
import { mountCinematicAutoScroll } from "./auto-scroll";
import { cinematicAutoPlan } from "./auto-scroll-plan";

/** Public Cinematic presentation only; editing never starts automatic movement. */
export function CinematicAutoScroll({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".cinematic-invitation");
    if (!enabled || !root) return;
    const cover =
      root.querySelector<HTMLElement>("[data-invitation-cover]") ??
      root
        .closest("[data-invitation-entry]")
        ?.querySelector<HTMLElement>("[data-invitation-cover]") ??
      root.parentElement?.querySelector<HTMLElement>("[data-invitation-cover]");
    if (!cover) return;
    const controller = mountCinematicAutoScroll(root, null, {
      cover,
      plan: () => cinematicAutoPlan(root, null),
    });
    return () => controller.dispose();
  }, [enabled]);
  return <span hidden ref={ref} aria-hidden="true" />;
}
