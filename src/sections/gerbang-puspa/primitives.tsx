"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { GP_ASSETS } from "./assets";
import { splitGerbangPuspaNames } from "./content";
import { useGerbangPuspa } from "./opening";
import styles from "./foundation.module.css";

function parts(names: string) {
  return splitGerbangPuspaNames(names);
}

export function GerbangPuspaNames({
  names,
  compact = false,
}: {
  names: string;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.names} ${compact ? styles.compact : ""}`}>
      {parts(names).map((name, index) => (
        <Fragment key={index}>
          {index > 0 && <span className={styles.ampersand}>&amp;</span>}
          <span className={styles.name}>{name}</span>
        </Fragment>
      ))}
    </div>
  );
}

/** Independent, data-derived initials; no vendor/reference monogram binary. */
export function GerbangPuspaMonogram({
  names,
  className = "",
}: {
  names: string;
  className?: string;
}) {
  const initials = parts(names).map((name) => Array.from(name.trim())[0] ?? "");
  return (
    <svg
      className={`${styles.monogram} ${className}`}
      viewBox="0 0 128 148"
      aria-hidden="true"
    >
      <path
        d="M35 79C8 59 24 28 63 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="27"
        y="88"
        fontSize="78"
        fill="currentColor"
        transform="rotate(-12 27 88)"
      >
        {initials[0]}
      </text>
      <text x="67" y="134" fontSize="78" fill="currentColor">
        {initials[1] ?? ""}
      </text>
      <path
        d="M74 32 62 103"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function GerbangPuspaFlowers({
  className = "",
}: {
  className?: string;
}) {
  // Native images retain the authored SVG geometry, with no optimization crop.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={GP_ASSETS.flowers}
      className={className}
      alt=""
      aria-hidden="true"
    />
  );
}

export function GerbangPuspaOrnaments({ hero = false }: { hero?: boolean }) {
  return (
    <div className={styles.ornaments} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={GP_ASSETS.floralLeft} className={styles.topLeft} alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={GP_ASSETS.floralRight} className={styles.topRight} alt="" />
      <GerbangPuspaFlowers
        className={hero ? styles.heroFlowers : styles.bottomRight}
      />
    </div>
  );
}

export function GerbangPuspaReveal({
  children,
  kind = "up",
  duration = 3000,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  kind?: "up" | "down" | "zoom" | "left" | "right";
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const { opened, reducedMotion } = useGerbangPuspa();
  useEffect(() => {
    if (!opened || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { root: ref.current.closest("[data-device-scroller]"), threshold: 0.05 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [opened]);
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${seen ? styles[kind] : ""} ${className}`}
      style={
        {
          animationDelay: reducedMotion ? "0ms" : `${delay}ms`,
          animationDuration: reducedMotion ? "0ms" : `${duration}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
