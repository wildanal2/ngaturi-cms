"use client";

import { useState, type CSSProperties } from "react";
import { GerbangPuspaReveal } from "./primitives";
import type { ComponentProps } from "react";
import styles from "./phase-two.module.css";

/** Missing/broken persisted media retains the measured box with original local art. */
export function GerbangPuspaMedia({
  src,
  fallback,
  alt,
  className,
  style,
  eager = false,
}: {
  src?: string;
  fallback: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const source = src?.trim() || fallback;
  const resolved = failed === source ? fallback : source;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(image) => {
        // A broken SSR image may finish before hydration attaches onError.
        if (
          image?.complete &&
          image.naturalWidth === 0 &&
          resolved !== fallback
        )
          setFailed(source);
      }}
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      data-gp-media-fallback={!src?.trim() || failed === source || undefined}
      onError={resolved === fallback ? undefined : () => setFailed(source)}
    />
  );
}

/** Builder presents editable content immediately without decorative waits. */
export function GerbangPuspaPhaseTwoReveal({
  inCanvas,
  className = "",
  ...props
}: ComponentProps<typeof GerbangPuspaReveal> & { inCanvas?: boolean }) {
  return (
    <GerbangPuspaReveal
      {...props}
      className={`${className} ${inCanvas ? styles.immediate : ""}`}
    />
  );
}
