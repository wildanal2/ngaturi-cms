"use client";

import { useRef } from "react";
import { EnchantedGardenErrorBoundary } from "./error-boundary";
import styles from "./enchanted-garden.module.css";
import { useJourneyProgress } from "./progress";
import { EnchantedGardenScene } from "./scene/enchanted-garden-scene";
import type { SceneQuality } from "./types";
import { useReducedMotion } from "./use-reduced-motion";

export function EnchantedGardenStage({
  quality = "medium",
}: {
  quality?: SceneQuality;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const progressRef = useJourneyProgress(stageRef);
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      ref={stageRef}
      className={styles.stage}
      data-enchanted-garden-stage
    >
      <div className={styles.viewport}>
        <EnchantedGardenErrorBoundary>
          <EnchantedGardenScene
            progressRef={progressRef}
            quality={quality}
            prefersReducedMotion={prefersReducedMotion}
          />
        </EnchantedGardenErrorBoundary>
        <div className={styles.vignette} aria-hidden="true" />
      </div>
    </section>
  );
}
