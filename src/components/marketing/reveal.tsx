"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Dir = "up" | "down" | "left" | "right" | "zoom";

/**
 * Landing-page scroll reveal. Animates in when it enters the viewport and
 * resets on exit so the motion replays as you scroll up and down.
 */
export function Reveal({
  children,
  dir = "up",
  as = "div",
  stagger = false,
  className = "",
  delay,
}: {
  children: ReactNode;
  dir?: Dir;
  as?: keyof HTMLElementTagNameMap;
  stagger?: boolean;
  className?: string;
  delay?: number;
}) {
  // R3F extends JSX.IntrinsicElements with scene objects. Narrow the dynamic
  // element back to HTML so those incompatible ref/style props do not merge.
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-dir={dir}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={[
        stagger ? "m-stagger" : "m-reveal",
        inView ? "is-in" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
