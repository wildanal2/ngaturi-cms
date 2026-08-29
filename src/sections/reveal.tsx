"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a section and reveals it (fade-up / zoom / slide) the first time it
 * scrolls into view. Each section gets its own observer so animations run
 * individually as the guest scrolls.
 */
export function Reveal({
  children,
  animation = "fade",
  immediate = false,
}: {
  children: ReactNode;
  animation?: "none" | "fade" | "slide" | "zoom";
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate || animation === "none");

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const type = animation === "fade" ? "" : animation;

  return (
    <div
      ref={ref}
      data-reveal={type || undefined}
      className={visible ? "is-visible" : undefined}
    >
      {children}
    </div>
  );
}
