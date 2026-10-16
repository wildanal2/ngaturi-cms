"use client";

import { useGerbangPuspa } from "./opening";
import styles from "./gate.module.css";

/** Original architectural linework. Each leaf is a separate vector layer;
 * the flat garden illustration remains intact behind it. */
export function GerbangPuspaGate() {
  const { completeOpening } = useGerbangPuspa();
  return (
    <div
      className={styles.gate}
      aria-hidden="true"
      data-gp-gate
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) completeOpening();
      }}
    >
      <svg
        className={styles.arch}
        viewBox="0 0 360 600"
        preserveAspectRatio="none"
      >
        <path d="M16 590V190C16-30 344-30 344 190V590M23 590V190C23-20 337-20 337 190V590" />
      </svg>
      {[false, true].map((right) => (
        <div className={right ? styles.right : styles.left} key={String(right)}>
          <svg viewBox="0 0 360 600" preserveAspectRatio="none">
            <g transform={right ? "translate(360 0) scale(-1 1)" : undefined}>
              <path
                d="M27 590V190C27 94 89 27 180 27V590Z"
                className={styles.leaf}
              />
              {[
                [48, 116],
                [72, 78],
                [96, 55],
                [120, 40],
                [144, 31],
                [168, 27],
              ].map(([x, y]) => (
                <path key={x} d={`M${x} ${y}V590`} />
              ))}
              <path d="M27 290H180M27 478H180M164 320V352" />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
}
