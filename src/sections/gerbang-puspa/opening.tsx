"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { useLoadingPhase } from "../loading/context";
import type { SectionData } from "../types";
import { openingHandoff } from "./opening-handoff";
import {
  createOpeningLifecycle,
  GP_OPENING_MS,
  holdClosedEntry,
  type OpeningStage,
} from "./lifecycle";
import { GerbangPuspaNavigation } from "./navigation";
import {
  gerbangNavigationEnabled,
  gerbangNavigationTargets,
} from "./navigation-data";
import styles from "./foundation.module.css";

type Presentation = {
  managed: boolean;
  stage: OpeningStage;
  opened: boolean;
  heroReady: boolean;
  reducedMotion: boolean;
  desktopComposition: boolean;
  heroMediaUrl?: string;
  beginOpening: (gesture: () => void) => boolean;
  completeOpening: () => void;
};
const Context = createContext<Presentation>({
  managed: false,
  stage: "opened",
  opened: true,
  heroReady: true,
  reducedMotion: false,
  desktopComposition: false,
  beginOpening: (gesture) => {
    gesture();
    return true;
  },
  completeOpening: () => {},
});
export const useGerbangPuspa = () => useContext(Context);

/** SSR and hydration share the same keyboard boundary, before effects attach. */
export function GerbangPuspaSection({
  children,
  type,
  id,
}: {
  children: ReactNode;
  type: string;
  id: string;
}) {
  const { stage } = useGerbangPuspa();
  const content = type !== "cover";
  return (
    <div
      data-section={type}
      data-section-id={id}
      id={`gp-section-${id}`}
      data-gp-content={content || undefined}
      inert={content && stage === "closed"}
    >
      {children}
    </div>
  );
}

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
  const initialStage = !hasCover || inCanvas ? "opened" : "closed";
  const [stage, setStage] = useState<OpeningStage>(initialStage);
  const [lifecycle] = useState(() =>
    createOpeningLifecycle(initialStage, setStage),
  );
  const presentedStage = !hasCover || inCanvas ? "opened" : stage;
  const presentedOpen = presentedStage !== "closed";
  const [reducedMotion, setReducedMotion] = useState(false);
  const [desktopComposition, setDesktopComposition] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<string>();
  const [viewportWidth, setViewportWidth] = useState<string>();
  const surface = useRef<HTMLDivElement>(null);
  const handoff = useRef<(() => void) | undefined>(undefined);
  const release = useRef<(() => void) | undefined>(undefined);
  const entryRelease = useRef<(() => void) | undefined>(undefined);
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
      setViewportWidth(
        `${Math.min(scroller?.clientWidth ?? surface.current?.clientWidth ?? window.innerWidth, 500)}px`,
      );
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
    const root = surface.current;
    if (!enabled || !root) return;
    const update = () => {
      root.dataset.backgrounded = String(document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled || presentedOpen || inCanvas || !surface.current) return;
    const restore = holdClosedEntry(surface.current);
    entryRelease.current = restore;
    return () => {
      restore();
      if (entryRelease.current === restore) entryRelease.current = undefined;
    };
  }, [enabled, presentedOpen, inCanvas]);

  useLayoutEffect(() => {
    const root = surface.current;
    if (!enabled || !root || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          (entry.target as HTMLElement).dataset.gpInView = String(
            entry.isIntersecting,
          );
        }),
      { root: inCanvas ? root.closest("[data-device-scroller]") : null },
    );
    const observed = new Set<Element>();
    const observe = () => {
      for (const element of observed)
        if (!root.contains(element)) {
          observer.unobserve(element);
          observed.delete(element);
        }
      root
        .querySelectorAll("[data-scene], [data-invitation-cover]")
        .forEach((element) => {
          if (observed.has(element)) return;
          observed.add(element);
          observer.observe(element);
        });
    };
    observe();
    const mutations = new MutationObserver(observe);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [enabled, inCanvas]);

  useEffect(() => {
    if (!enabled || presentedOpen || phase !== "complete") return;
    const owner = document.documentElement;
    const previous = owner.style.overflow;
    owner.style.overflow = "hidden";
    let released = false;
    const restore = () => {
      if (released) return;
      released = true;
      owner.style.overflow = previous;
    };
    release.current = restore;
    return () => {
      restore();
      if (release.current === restore) release.current = undefined;
    };
  }, [enabled, presentedOpen, phase]);

  useEffect(
    () => () => {
      handoff.current?.();
      release.current?.();
      entryRelease.current?.();
      lifecycle.cancel();
    },
    [lifecycle],
  );

  const beginOpening = useCallback(
    (gesture: () => void) => {
      if (phase !== "complete" || !lifecycle.begin(gesture, reducedMotion))
        return false;
      release.current?.();
      release.current = undefined;
      surface.current
        ?.querySelectorAll<HTMLElement>("[data-gp-content]")
        .forEach((element) => {
          element.inert = false;
        });
      entryRelease.current?.();
      entryRelease.current = undefined;
      handoff.current?.();
      if (surface.current && !inCanvas)
        handoff.current = openingHandoff(surface.current, reducedMotion);
      return true;
    },
    [phase, lifecycle, reducedMotion, inCanvas],
  );

  if (!enabled) return <>{children}</>;
  return (
    <Context
      value={{
        managed: true,
        stage: presentedStage,
        opened: presentedOpen,
        heroReady: presentedOpen && phase === "complete",
        reducedMotion,
        desktopComposition,
        heroMediaUrl: typeof media === "string" ? media : undefined,
        beginOpening,
        completeOpening: lifecycle.complete,
      }}
    >
      <div
        ref={surface}
        data-gerbang-puspa
        data-in-canvas={inCanvas}
        data-opened={presentedOpen}
        data-opening-stage={presentedStage}
        data-has-navigation={
          gerbangNavigationEnabled(sections) &&
          gerbangNavigationTargets(sections).length >= 2
        }
        className={`${styles.scope} ${styles.presentation}`}
        style={
          {
            "--gp-viewport-height": viewportHeight,
            "--gp-column-width": viewportWidth,
            "--gp-opening-duration": `${GP_OPENING_MS}ms`,
          } as CSSProperties
        }
      >
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.column}>{children}</div>
        <GerbangPuspaNavigation
          sections={sections}
          surface={surface}
          inCanvas={inCanvas}
        />
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
  const activated = useRef(false);
  return {
    activate: () => {
      if (open || activated.current) return;
      // useOpen dispatches ngaturi:open synchronously within the native gesture.
      activated.current = presentation.beginOpening(reveal);
    },
  };
}
