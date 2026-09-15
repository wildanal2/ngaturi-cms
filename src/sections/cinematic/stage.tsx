"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Backdrop } from "./primitives";
import styles from "./cinematic.module.css";

export function CinematicStage({
  children,
  inCanvas = false,
  layoutKey,
  presentationMode,
  selectedId,
  onSelect,
}: {
  children: ReactNode;
  inCanvas?: boolean;
  layoutKey: string;
  presentationMode: "cinematic" | "simple";
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const simple = presentationMode === "simple";
  useEffect(() => {
    const root = ref.current;
    if (!root || simple) return;
    const scroller = inCanvas
      ? root.closest<HTMLElement>("[data-device-scroller]")
      : null;
    // Never accidentally bind a builder stage to window scroll.
    if (inCanvas && !scroller) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let generation = 0;
    let cleanup: (() => void) | undefined;
    const enhance = async () => {
      const current = ++generation;
      cleanup?.();
      cleanup = undefined;
      if (reduced.matches) return;
      try {
        const { mountCinematicTimeline } = await import("./timeline");
        if (!cancelled && current === generation)
          cleanup = mountCinematicTimeline(root, scroller);
      } catch {
        // The pre-rendered, linear DOM remains usable when enhancement fails.
      }
    };
    void enhance();
    reduced.addEventListener("change", enhance);
    return () => {
      cancelled = true;
      generation++;
      reduced.removeEventListener("change", enhance);
      cleanup?.();
    };
  }, [inCanvas, layoutKey, simple]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-section-id]").forEach((el) => {
      el.dataset.selected = String(el.dataset.sectionId === selectedId);
    });
  }, [selectedId]);

  return (
    <div
      ref={ref}
      className={styles.stage}
      data-cinematic-stage
      data-in-canvas={inCanvas || undefined}
      onClickCapture={
        onSelect
          ? (event) => {
              const section = (
                event.target as HTMLElement
              ).closest<HTMLElement>("[data-section-id]");
              if (section?.dataset.sectionId)
                onSelect(section.dataset.sectionId);
            }
          : undefined
      }
    >
      <div className={styles.viewport} data-cinematic-viewport>
        <Backdrop />
        {children}
        <div
          className={styles.progress}
          data-cinematic-progress
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
