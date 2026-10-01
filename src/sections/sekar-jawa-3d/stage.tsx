"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SekarJawa3DErrorBoundary } from "./error-boundary";
import styles from "./sekar-jawa-3d.module.css";
import { useJourneyProgress } from "./progress";
import { useSekarJawa3DQuality } from "./quality";
import { SekarJawa3DScene } from "./scene/sekar-jawa-3d-scene";
import { useReducedMotion } from "./use-reduced-motion";

export function SekarJawa3DStage({
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
  const { progressRef, seekToTarget, openAtEntrance } = useJourneyProgress(
    stageRef,
    inCanvas,
    waitForOpen,
  );
  const quality = useSekarJawa3DQuality(viewportRef, inCanvas);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onOpen = () => {
      openAtEntrance();
      // Land on the actual DOM identity, before the visitor starts scrolling.
      // The existing seeker keeps the same public / DeviceFrame ownership.
      seekToTarget("hero");
    };
    const onSeek = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const section = [
        ...stage.querySelectorAll<HTMLElement>("[data-section-id]"),
      ].find((node) => node.dataset.sectionId === id);
      const sectionType = section?.dataset.section;
      if (!sectionType || !seekToTarget(sectionType)) return;
      event.preventDefault();
    };
    const onNavigate = (event: Event) => {
      const sectionType = (event as CustomEvent<string>).detail;
      if (seekToTarget(sectionType)) event.preventDefault();
    };

    window.addEventListener("ngaturi:open", onOpen);
    stage.addEventListener("sekar-jawa-3d:seek", onSeek);
    stage.addEventListener("sekar-jawa-3d:navigate", onNavigate);
    return () => {
      window.removeEventListener("ngaturi:open", onOpen);
      stage.removeEventListener("sekar-jawa-3d:seek", onSeek);
      stage.removeEventListener("sekar-jawa-3d:navigate", onNavigate);
    };
  }, [openAtEntrance, seekToTarget]);

  return (
    <section
      ref={stageRef}
      className={styles.stage}
      data-sekar-jawa-3d-stage
      data-in-canvas={inCanvas || undefined}
      data-scene-quality={quality}
    >
      <div ref={viewportRef} className={styles.viewport}>
        <SekarJawa3DErrorBoundary>
          <SekarJawa3DScene
            progressRef={progressRef}
            quality={quality}
            prefersReducedMotion={prefersReducedMotion}
          />
        </SekarJawa3DErrorBoundary>
        <div className={styles.vignette} aria-hidden="true" />
      </div>
      <div className={styles.contentRail}>{children}</div>
    </section>
  );
}
