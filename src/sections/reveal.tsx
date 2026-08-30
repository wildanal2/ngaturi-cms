"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnimationKind } from "./types";

/**
 * Scroll-reveal wrapper (AOS-style). A section animates in every time it
 * enters the viewport — scrolling down *or* back up — and resets when it
 * leaves, so the motion is always "alive".
 *
 * Gate: an unopened `[data-invitation-cover]` in the DOM holds reveals
 * back until the guest taps "Buka Undangan". 5s failsafe.
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
    if (immediate || animation === "none") return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    let io: IntersectionObserver | null = null;
    let failsafe = 0;
    const cleanups: (() => void)[] = [];

    const arm = () => {
      failsafe = window.setTimeout(() => setVisible(true), 5000);
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[entries.length - 1];
          setVisible(e.isIntersecting);
          if (e.isIntersecting) window.clearTimeout(failsafe);
        },
        { threshold: 0.12, rootMargin: "0px 0px -12% 0px" },
      );
      io.observe(el);
    };

    const cover = document.querySelector("[data-invitation-cover]");
    const locked = cover && cover.getAttribute("data-open") !== "1";

    if (locked) {
      const onOpen = () => arm();
      window.addEventListener("ngaturi:open", onOpen, { once: true });
      cleanups.push(() => window.removeEventListener("ngaturi:open", onOpen));
    } else {
      arm();
    }

    return () => {
      window.clearTimeout(failsafe);
      io?.disconnect();
      cleanups.forEach((c) => c());
    };
  }, [immediate, animation]);

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
