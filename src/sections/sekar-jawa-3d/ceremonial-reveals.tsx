"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** One-shot decoration only: no scroll state, hidden content or form remounts. */
export function CeremonialReveals({
  children,
  inCanvas,
  waitForOpen,
}: {
  children: ReactNode;
  inCanvas: boolean;
  waitForOpen: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !window.IntersectionObserver || !Element.prototype.animate)
      return;
    const root = inCanvas
      ? host.closest<HTMLElement>("[data-device-scroller]")
      : null;
    if (inCanvas && !root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (reduced.matches) continue;
          const card = entry.target as HTMLElement;
          const type = card.dataset.section;
          const functional = ["rsvp", "guestbook", "gift"].includes(type ?? "");
          // Functional sections animate only their heading, never fields or controls.
          const selector = functional
            ? "h2"
            : "[data-ceremony-reveal], h2, blockquote, .inv-stagger > *";
          const targets = [...card.querySelectorAll<HTMLElement>(selector)];
          targets.forEach((node, index) => {
            const delay = Number(
              node.dataset.ceremonyReveal ?? Math.min(index * 85, 420),
            );
            const animation = node.animate(
              [
                {
                  opacity: type === "hero" ? 0.65 : 0,
                  transform: `translateY(${functional ? 3 : 10}px)`,
                },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: functional ? 400 : 850,
                delay,
                easing: "cubic-bezier(.22,.61,.36,1)",
                fill: "backwards",
              },
            );
            animations.add(animation);
            animation.onfinish = () => {
              animations.delete(animation);
              animation.cancel();
            };
          });
        }
      },
      { root, threshold: 0.08 },
    );
    const start = () =>
      host
        .querySelectorAll<HTMLElement>(
          '[data-section]:not([data-section="cover"])',
        )
        .forEach((node) => observer.observe(node));
    const cancel = () => {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const onMotionChange = () => {
      if (reduced.matches) cancel();
    };
    if (waitForOpen)
      window.addEventListener("ngaturi:open", start, { once: true });
    else start();
    reduced.addEventListener("change", onMotionChange);
    return () => {
      observer.disconnect();
      cancel();
      reduced.removeEventListener("change", onMotionChange);
      window.removeEventListener("ngaturi:open", start);
    };
  }, [inCanvas, waitForOpen]);
  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
