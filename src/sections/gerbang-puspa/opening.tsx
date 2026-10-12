"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { useLoadingPhase } from "../loading/context";
import type { SectionData } from "../types";
import styles from "./foundation.module.css";

type Presentation = {
  opened: boolean;
  heroReady: boolean;
  reducedMotion: boolean;
  desktopComposition: boolean;
  heroMediaUrl?: string;
  beginOpening: () => void;
};
const Context = createContext<Presentation>({
  opened: true,
  heroReady: true,
  reducedMotion: false,
  desktopComposition: false,
  beginOpening: () => {},
});
export const useGerbangPuspa = () => useContext(Context);

/** A presentation shell only: section contracts and their renderer stay native. */
export function GerbangPuspaPresentation({
  children,
  sections,
  enabled = true,
  inCanvas = false,
}: {
  children: ReactNode;
  sections: readonly SectionData[];
  enabled?: boolean;
  inCanvas?: boolean;
}) {
  const phase = useLoadingPhase();
  const hasCover = sections.some(
    (section) =>
      section.type === "cover" &&
      section.variant === "gerbang-puspa" &&
      section.visible !== false,
  );
  const [opened, setOpened] = useState(!hasCover || inCanvas);
  const [heroReady, setHeroReady] = useState(!hasCover || inCanvas);
  const presentedOpen = opened || !hasCover || inCanvas;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [desktopComposition, setDesktopComposition] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<string>();
  const surface = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const release = useRef<(() => void) | undefined>(undefined);
  const media = sections.find(
    (section) => section.type === "hero" && section.visible !== false,
  )?.props.couple_image;

  useEffect(() => {
    if (!enabled || !surface.current) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    const scroller = inCanvas
      ? surface.current.closest<HTMLElement>("[data-device-scroller]")
      : null;
    const measure = () => {
      setDesktopComposition(
        (scroller?.clientWidth ?? window.innerWidth) >= 515,
      );
      setViewportHeight(`${scroller?.clientHeight ?? window.innerHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller ?? surface.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      motion.removeEventListener("change", updateMotion);
    };
  }, [enabled, inCanvas]);

  useEffect(() => {
    if (!enabled || presentedOpen || phase !== "complete") return;
    const owner = document.documentElement;
    const previous = owner.style.overflow;
    owner.style.overflow = "hidden";
    const restore = () => {
      owner.style.overflow = previous;
    };
    release.current = restore;
    return () => {
      restore();
      if (release.current === restore) release.current = undefined;
    };
  }, [enabled, presentedOpen, phase]);

  useEffect(() => {
    const elements =
      surface.current?.querySelectorAll<HTMLElement>("[data-gp-content]") ?? [];
    elements.forEach((element) => {
      element.inert = !presentedOpen;
    });
    return () => {
      elements.forEach((element) => {
        element.inert = false;
      });
    };
  }, [presentedOpen, sections]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      release.current?.();
    },
    [],
  );

  function beginOpening() {
    release.current?.();
    release.current = undefined;
    surface.current
      ?.querySelectorAll<HTMLElement>("[data-gp-content]")
      .forEach((element) => {
        element.inert = false;
      });
    setOpened(true);
    clearTimeout(timer.current);
    const handoff = () => {
      setHeroReady(true);
      const target = surface.current?.querySelector<HTMLElement>(
        "[data-gp-hero-focus]",
      );
      if (!target) return;
      const owner = inCanvas
        ? surface.current?.closest<HTMLElement>("[data-device-scroller]")
        : null;
      if (inCanvas && !owner) return;
      const top = owner
        ? target.getBoundingClientRect().top -
          owner.getBoundingClientRect().top +
          owner.scrollTop
        : target.getBoundingClientRect().top + window.scrollY;
      if (owner)
        owner.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
      else
        window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
      target.focus({ preventScroll: true });
    };
    if (reducedMotion) handoff();
    else timer.current = setTimeout(handoff, 1000);
  }

  if (!enabled) return <>{children}</>;
  return (
    <Context
      value={{
        opened: presentedOpen,
        heroReady: (heroReady || !hasCover || inCanvas) && phase === "complete",
        reducedMotion,
        desktopComposition,
        heroMediaUrl: typeof media === "string" ? media : undefined,
        beginOpening,
      }}
    >
      <div
        ref={surface}
        data-gerbang-puspa
        data-in-canvas={inCanvas}
        data-opened={presentedOpen}
        className={`${styles.scope} ${styles.presentation}`}
        style={{ "--gp-viewport-height": viewportHeight } as CSSProperties}
      >
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.column}>{children}</div>
      </div>
    </Context>
  );
}

export function useGerbangPuspaCoverOpening({
  open,
  reveal,
}: {
  open: boolean;
  reveal: () => void;
  coverRef: RefObject<HTMLElement | null>;
  inCanvas?: boolean;
}) {
  const presentation = useGerbangPuspa();
  return {
    activate: () => {
      if (open) return;
      // useOpen dispatches ngaturi:open synchronously within the native gesture.
      reveal();
      presentation.beginOpening();
    },
  };
}
