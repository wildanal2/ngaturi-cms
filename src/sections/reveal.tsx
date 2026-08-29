"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnimationKind } from "./types";

/**
 * Scroll-reveal wrapper (AOS-style). Every wrapped section starts hidden
 * and animates in the first time it enters the viewport. One observer per
 * section so each animates individually.
 *
 * - `immediate` (used for the cover/first section) starts visible, no anim.
 * - No JS / observer unsupported / 4s elapsed → force visible (failsafe).
 * - The builder canvas never mounts <Reveal>, so its sections are static.
 */
export function Reveal({
  children,
  animation = "fade-up",
  immediate = false,
}: {
  children: ReactNode;
  animation?: AnimationKind;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate || animation === "none");

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const reveal = () => setVisible(true);
    // already on screen at mount (e.g. after the cover opens) → reveal now
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      reveal();
      return;
    }

    const failsafe = window.setTimeout(reveal, 4000);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          reveal();
          window.clearTimeout(failsafe);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(failsafe);
      io.disconnect();
    };
  }, [visible]);

  if (animation === "none") return <>{children}</>;

  return (
    <div
      ref={ref}
      data-reveal={animation}
      className={visible ? "is-visible" : undefined}
    >
      {children}
    </div>
  );
}
