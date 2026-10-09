"use client";

import type { SectionRenderProps } from "../types";
import { useLoadingPhase } from "./context";
import { DEFAULT_LOADING_MESSAGE } from "./resolve";
import {
  DelimaSeal,
  Divider,
  serambiTheme,
  textProp,
} from "../serambi-delima/primitives";
import styles from "../serambi-delima/serambi-delima.module.css";

export function LoadingSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const phase = useLoadingPhase();
  if (!inCanvas && phase === "complete") return null;
  const message = textProp(props.message).trim() || DEFAULT_LOADING_MESSAGE;
  return (
    <div
      className={`${serambiTheme} ${styles.loading} ${inCanvas ? styles.loadingCanvas : ""}`}
      data-loading-screen
      data-loading-phase={phase}
      role="status"
      aria-live="polite"
      tabIndex={inCanvas ? undefined : -1}
    >
      <div className={styles.loadingContent}>
        <DelimaSeal className={styles.loadingSeal} />
        {textProp(props.names) ? (
          <p className={styles.loadingNames}>{textProp(props.names)}</p>
        ) : null}
        <Divider />
        <p className={styles.loadingMessage}>{message}</p>
        <span className={styles.loadingLine} aria-hidden="true" />
      </div>
    </div>
  );
}
