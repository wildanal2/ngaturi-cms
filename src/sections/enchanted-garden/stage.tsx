"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EnchantedGardenErrorBoundary } from "./error-boundary";
import styles from "./enchanted-garden.module.css";
import { useJourneyProgress } from "./progress";
import { useEnchantedGardenQuality } from "./quality";
import { EnchantedGardenScene } from "./scene/enchanted-garden-scene";
import { useReducedMotion } from "./use-reduced-motion";

export function EnchantedGardenStage({
  children,
  inCanvas = false,
  waitForOpen = false,
}: {
  children?: ReactNode;
  inCanvas?: boolean;
  waitForOpen?: boolean;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { progressRef, seekToProgress, openAtEntrance } = useJourneyProgress(
    stageRef,
    inCanvas,
    waitForOpen,
  );
  const quality = useEnchantedGardenQuality(viewportRef, inCanvas);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onOpen = () => openAtEntrance();
    const onSeek = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const section = [
        ...stage.querySelectorAll<HTMLElement>("[data-section-id]"),
      ].find((node) => node.dataset.sectionId === id);
      const stop = section?.closest<HTMLElement>("[data-journey-progress]");
      if (!stop) return;
      event.preventDefault();
      seekToProgress(Number(stop.dataset.journeyProgress));
    };

    window.addEventListener("ngaturi:open", onOpen);
    stage.addEventListener("enchanted-garden:seek", onSeek);
    return () => {
      window.removeEventListener("ngaturi:open", onOpen);
      stage.removeEventListener("enchanted-garden:seek", onSeek);
    };
  }, [openAtEntrance, seekToProgress]);

  return (
    <section
      ref={stageRef}
      className={styles.stage}
      data-enchanted-garden-stage
      data-in-canvas={inCanvas || undefined}
      data-scene-quality={quality}
    >
      <div ref={viewportRef} className={styles.viewport}>
        <EnchantedGardenErrorBoundary>
          <EnchantedGardenScene
            progressRef={progressRef}
            quality={quality}
            prefersReducedMotion={prefersReducedMotion}
          />
        </EnchantedGardenErrorBoundary>
        <div className={styles.vignette} aria-hidden="true" />
      </div>
      <div className={styles.contentRail}>{children}</div>
    </section>
  );
}
