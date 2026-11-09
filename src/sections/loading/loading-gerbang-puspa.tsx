"use client";

import type { SectionRenderProps } from "../types";
import { useEffect, useRef } from "react";
import { useLoadingPhase } from "./context";
import styles from "./loading-gerbang-puspa.module.css";

/** The existing boundary owns readiness and its bounded leaving phase. */
export function LoadingGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const phase = useLoadingPhase();
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!inCanvas && phase === "pending") {
      screen.current?.focus({ preventScroll: true });
    }
  }, [inCanvas, phase]);
  if (!inCanvas && phase === "complete") return null;
  const message =
    typeof props.message === "string"
      ? props.message
      : "Mempersiapkan undangan";

  return (
    <div
      ref={screen}
      className={`${styles.screen} ${inCanvas ? styles.inline : ""}`}
      data-loading-screen
      data-gerbang-puspa-loading
      data-loading-phase={inCanvas ? "pending" : phase}
      role="status"
      aria-live="polite"
      aria-label={message}
      tabIndex={-1}
    >
      <span className={styles.indicator} aria-hidden="true" />
    </div>
  );
}
