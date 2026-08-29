"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnimationKind } from "./types";

/**
 * Scroll-reveal wrapper (AOS-style). Each wrapped section starts hidden and
 * animates in the first time it enters the viewport — but not before the
 * guest has opened the cover (otherwise everything animates behind the
 * cover and looks static afterwards).
 *
 * Gate: an unopened `[data-invitation-cover]` in the DOM holds reveals
 * back; opening it (or the absence of a cover) arms them. 5s failsafe.
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

    let io: IntersectionObserver | null = null;
    let failsafe = 0;
    const cleanups: (() => void)[] = [];

    const arm = () => {
      failsafe = window.setTimeout(() => setVisible(true), 5000);
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setVisible(true);
            window.clearTimeout(failsafe);
            io?.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -12% 0px" },
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
