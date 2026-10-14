"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Backdrop } from "./primitives";
import styles from "./cinematic.module.css";

/** Natural-height chapters. No timeline, transforms, pinning, or moving fields. */
export function InteractionSequence({
  children,
  selectedId,
  onSelect,
  inCanvas,
  presentationMode,
}: {
  children: ReactNode;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  inCanvas?: boolean;
  presentationMode?: "cinematic" | "simple";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || presentationMode === "simple") return;
    const environment = root.querySelector<HTMLElement>(
      "[data-salon-environment]",
    );
    if (!environment) return;
    const owner = inCanvas
      ? root.closest<HTMLElement>("[data-device-scroller]")
      : window;
    if (!owner) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let lastHeight = 0;
    const setHeight = (height: number) => {
      if (height === lastHeight) return;
      lastHeight = height;
      environment.style.setProperty("--salon-height", `${height}px`);
    };
    const update = () => {
      raf = 0;
      const focused =
        document.activeElement instanceof HTMLElement &&
        root.contains(document.activeElement);
      const height =
        owner instanceof HTMLElement ? owner.clientHeight : window.innerHeight;
      const top =
        owner instanceof HTMLElement ? owner.getBoundingClientRect().top : 0;
      if (reduced.matches || (height < 560 && root.clientWidth > height)) {
        setHeight(height);
        environment.style.removeProperty("--interaction-depth");
        return;
      }
      if (
        focused &&
        document.activeElement?.closest(
          "input, textarea, select, button, summary, [contenteditable]",
        )
      ) {
        setHeight(height);
        return;
      }
      const box = root.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (top + height - box.top) / (height + box.height)),
      );
      const chapters = [
        ...root.querySelectorAll<HTMLElement>("[data-cinematic-interaction]"),
      ];
      const active = chapters.find((chapter) => {
        const bounds = chapter.getBoundingClientRect();
        return (
          bounds.top <= top + height * 0.3 && bounds.bottom > top + height * 0.3
        );
      });
      // Finish geometry reads before writes. Keep animated variables on the
      // ornament branch so forms and messages do not inherit per-frame changes.
      setHeight(height);
      environment.style.setProperty("--interaction-depth", `${(progress - 0.5) * 28}px`);
      const chapter =
        active?.dataset.section ?? (box.top > top ? "arrival" : "departure");
      if (root.dataset.salonChapter !== chapter)
        root.dataset.salonChapter = chapter;
      const arrival = Math.max(
        0,
        Math.min(1, (top + height - box.top) / (height * 0.65)),
      );
      const departure = Math.max(
        0,
        Math.min(1, (box.bottom - top) / (height * 0.65)),
      );
      environment.style.setProperty(
        "--salon-light",
        `${Math.min(arrival, departure)}`,
      );
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    owner.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    root.addEventListener("focusout", request);
    reduced.addEventListener("change", request);
    update();
    return () => {
      cancelAnimationFrame(raf);
      owner.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      root.removeEventListener("focusout", request);
      reduced.removeEventListener("change", request);
      environment.style.removeProperty("--interaction-depth");
      environment.style.removeProperty("--salon-height");
      environment.style.removeProperty("--salon-light");
      delete root.dataset.salonChapter;
    };
  }, [inCanvas, presentationMode]);
  useEffect(() => {
    ref.current
      ?.querySelectorAll<HTMLElement>("[data-section-id]")
      .forEach((node) => {
        node.dataset.selected = String(node.dataset.sectionId === selectedId);
      });
  }, [selectedId]);
  return (
    <div
      ref={ref}
      className={styles.interactionSequence}
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
      <div
        className={styles.salonEnvironment}
        data-salon-environment
        aria-hidden="true"
      >
        <Backdrop />
        <div className={styles.salonArch} />
        <div className={styles.salonLight} />
      </div>
      <div className={styles.interactionContent}>{children}</div>
    </div>
  );
}
