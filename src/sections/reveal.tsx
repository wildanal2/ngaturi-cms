"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveals a section (fade / slide / zoom) the first time it scrolls into
 * view. Progressive enhancement: server-rendered content is visible; on
 * mount, sections currently below the fold are hidden and animated in as
 * the guest scrolls. No JS / no observer → content just stays visible.
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
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (immediate || animation === "none") return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.9;
    if (!belowFold) return; // already visible — leave it

    setHidden(true);
    const failsafe = setTimeout(() => setHidden(false), 4000);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHidden(false);
          clearTimeout(failsafe);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      clearTimeout(failsafe);
      io.disconnect();
    };
  }, [immediate, animation]);

  if (animation === "none") return <>{children}</>;

  return (
    <div
      ref={ref}
      data-reveal={animation}
      className={hidden ? undefined : "is-visible"}
    >
      {children}
    </div>
  );
}
