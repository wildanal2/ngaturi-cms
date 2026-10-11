"use client";

import { useEffect, useRef } from "react";
import { useLoadingPhase } from "../loading/context";

/** One CSS entrance, gated by the existing loader/open event. Never owns scrolling. */
export function useSerambiEntrance(inCanvas?: boolean, waitForOpening = false) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useLoadingPhase();

  useEffect(() => {
    const element = ref.current;
    if (!element || inCanvas || phase !== "complete") return;
    let observer: IntersectionObserver | undefined;
    let coverObserver: MutationObserver | undefined;
    const reveal = () => {
      element.dataset.motion = "ready";
      observer?.disconnect();
    };
    const arm = () => {
      if (
        !waitForOpening ||
        !window.IntersectionObserver ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        reveal();
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        { root: element.closest("[data-device-scroller]"), threshold: 0.05 },
      );
      observer.observe(element);
    };
    const parent = element.closest('[data-section="hero"]')?.parentElement;
    const owner =
      element.closest("[data-invitation-entry]") ??
      (parent?.hasAttribute("data-reveal") ? parent.parentElement : parent);
    const closedCover = owner?.querySelector(
      '[data-invitation-cover][data-open="0"]',
    );
    const afterCover = () => {
      // Music still starts on ngaturi:open. Wait for the actual Cover exit so
      // the two sets of names never fade through one another.
      if (closedCover instanceof HTMLElement && !closedCover.hidden) {
        coverObserver = new MutationObserver(() => {
          if (!closedCover.hidden) return;
          coverObserver?.disconnect();
          arm();
        });
        coverObserver.observe(closedCover, {
          attributes: true,
          attributeFilter: ["hidden"],
        });
      } else arm();
    };
    if (waitForOpening && closedCover)
      window.addEventListener("ngaturi:open", afterCover, { once: true });
    else arm();
    return () => {
      observer?.disconnect();
      coverObserver?.disconnect();
      window.removeEventListener("ngaturi:open", afterCover);
    };
  }, [inCanvas, phase, waitForOpening]);

  return ref;
}
