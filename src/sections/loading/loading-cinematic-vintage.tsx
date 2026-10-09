"use client";

import type { SectionRenderProps } from "../types";
import { useLoadingPhase } from "./context";
import { DEFAULT_LOADING_MESSAGE } from "./resolve";
import styles from "./loading.module.css";

export function LoadingCinematicVintage({
  props,
  inCanvas,
}: SectionRenderProps) {
  const phase = useLoadingPhase();
  if (!inCanvas && phase === "complete") return null;
  const message =
    typeof props.message === "string" && props.message.trim()
      ? props.message
      : DEFAULT_LOADING_MESSAGE;
  return (
    <div
      className={`${styles.screen} ${inCanvas ? styles.static : ""}`}
      data-loading-screen
      data-loading-phase={phase}
      role="status"
      aria-live="polite"
      aria-label={message}
      tabIndex={inCanvas ? undefined : -1}
    >
      <div className={styles.frame}>
        <p className={styles.brand}>NGATURI</p>
        {typeof props.names === "string" && props.names.trim() ? (
          <h1 className={styles.names}>{props.names}</h1>
        ) : (
          <p className={styles.names}>Kisah Kami</p>
        )}
        <p className={styles.message}>{message}</p>
        <span className={styles.indicator} aria-hidden="true" />
      </div>
    </div>
  );
}
