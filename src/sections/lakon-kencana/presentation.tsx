"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type CSSProperties,
} from "react";
import { useLoadingPhase } from "../loading/context";
import type { SectionData } from "../types";
import type { NormalizedEvent } from "../events/event-data";
import {
  animateCinematicScroll,
  cancelCinematicScroll,
} from "../cinematic/scroll";
import { LAKON_OPEN_MS, hasLakonContent, primaryLakonEvent } from "./data";
import styles from "./lakon-kencana.module.css";
import { observeLakonEntrance, observeLakonParallax } from "./motion";

type Stage = "closed" | "opening" | "opened";
type Presentation = {
  stage: Stage;
  enter: () => void;
  primary?: NormalizedEvent;
  root?: RefObject<HTMLDivElement | null>;
  inCanvas?: boolean;
};
const Context = createContext<Presentation>({
  stage: "opened",
  enter: () => {},
});
export const useLakon = () => useContext(Context);

/** DeviceFrame keeps logical dimensions while scaling its outer mockup. */
export function lakonViewport(scroller?: HTMLElement | null) {
  if (!scroller) return { top: 0, height: innerHeight, scale: 1 };
  const box = scroller.getBoundingClientRect();
  return {
    top: box.top,
    height: box.height,
    scale:
      box.height > 0 && scroller.clientHeight > 0
        ? box.height / scroller.clientHeight
        : 1,
  };
}

export function LakonPresentation({
  enabled,
  sections,
  inCanvas,
  children,
  style,
}: {
  enabled: boolean;
  sections: readonly SectionData[];
  inCanvas?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  if (!enabled) return children;
  return (
    <Presentation
      key={sections.find((s) => s.type === "cover")?.id}
      sections={sections}
      inCanvas={inCanvas}
      style={style}
    >
      {children}
    </Presentation>
  );
}

function Presentation({
  sections,
  inCanvas,
  children,
  style,
}: {
  sections: readonly SectionData[];
  inCanvas?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const hasCover = sections.some(
    (s) => s.type === "cover" && s.visible !== false,
  );
  const [stage, setStage] = useState<Stage>(
    inCanvas || !hasCover ? "opened" : "closed",
  );
  const entry = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusFrame = useRef(0);
  const phase = useLoadingPhase();
  const primary = useMemo(() => primaryLakonEvent(sections), [sections]);
  const opened = stage === "opened" || !hasCover || inCanvas;

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  useEffect(() => {
    if (inCanvas) return;
    const openedByAnotherCover = () => {
      if (entry.current) return;
      entry.current = true;
      setStage("opened");
    };
    window.addEventListener("ngaturi:open", openedByAnotherCover);
    return () =>
      window.removeEventListener("ngaturi:open", openedByAnotherCover);
  }, [inCanvas]);
  useEffect(() => {
    if (inCanvas || opened || phase !== "complete") return;
    const page = document.documentElement;
    const overflow = page.style.overflow;
    const restoration = history.scrollRestoration;
    page.style.overflow = "hidden";
    history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => {
      page.style.overflow = overflow;
      history.scrollRestoration = restoration;
    };
  }, [inCanvas, opened, phase]);

  // Native flow has no cached scene geometry. Restore one reading anchor only
  // on a width change, using the actual document/DeviceFrame scroll owner.
  useEffect(() => {
    const element = root.current;
    if (!element || !opened) return;
    const scroller = element.closest<HTMLElement>("[data-device-scroller]");
    if (inCanvas && !scroller) return;
    const owner = scroller ?? window;
    const scrollingElement = scroller ?? document.documentElement;
    const previousClearance = scrollingElement.style.scrollPaddingBottom;
    scrollingElement.style.scrollPaddingBottom = "104px";
    let frame = 0;
    let width = element.clientWidth;
    let anchor: { node: HTMLElement; ratio: number } | undefined;
    const remember = () => {
      const viewport = lakonViewport(scroller);
      const point = viewport.top + viewport.height * 0.16;
      const nodes = [
        ...element.querySelectorAll<HTMLElement>("[data-lakon-scene]"),
      ];
      const node = nodes.find((n) => {
        const box = n.getBoundingClientRect();
        return box.top <= point && box.bottom > point;
      });
      if (node) {
        const box = node.getBoundingClientRect();
        anchor = {
          node,
          ratio: Math.max(0, (point - box.top) / Math.max(1, box.height)),
        };
      }
    };
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(remember);
    };
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      cancelCinematicScroll(owner);
      const focused = document.activeElement;
      if (
        focused?.matches("input,textarea,select,[contenteditable=true]") ||
        document.querySelector("dialog[open]")
      ) {
        remember();
        return;
      }
      const saved = anchor;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (saved?.node.isConnected) {
          const box = saved.node.getBoundingClientRect();
          const viewport = lakonViewport(scroller);
          const point = viewport.top + viewport.height * 0.16;
          const delta =
            (box.top + saved.ratio * box.height - point) / viewport.scale;
          owner.scrollBy({ top: delta, behavior: "instant" });
        }
        remember();
      });
    });
    remember();
    observer.observe(element);
    owner.addEventListener("scroll", scroll, { passive: true });
    return () => {
      observer.disconnect();
      owner.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
      cancelCinematicScroll(owner);
      scrollingElement.style.scrollPaddingBottom = previousClearance;
    };
  }, [opened, inCanvas]);

  const enter = () => {
    if (inCanvas || entry.current || phase !== "complete") return;
    entry.current = true;
    // Shared music attempts playback synchronously in the opening gesture.
    window.dispatchEvent(new Event("ngaturi:open"));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage(reduced ? "opened" : "opening");
    const complete = () => {
      setStage("opened");
      focusFrame.current = requestAnimationFrame(() => {
        const heading = root.current?.querySelector<HTMLElement>(
          "[data-lakon-scene] h1,[data-lakon-scene] h2",
        );
        heading?.focus({ preventScroll: true });
      });
    };
    timer.current = setTimeout(complete, reduced ? 0 : LAKON_OPEN_MS);
  };
  return (
    <Context
      value={{
        stage: opened ? "opened" : stage,
        enter,
        primary,
        root,
        inCanvas,
      }}
    >
      <div
        ref={root}
        className={styles.template}
        style={style}
        data-lakon-root
        data-canvas={inCanvas || undefined}
        data-state={
          opened ? "opened" : phase !== "complete" ? "loading" : stage
        }
      >
        {children}
      </div>
    </Context>
  );
}

export function LakonPart({
  section,
  children,
}: {
  section: SectionData;
  children: ReactNode;
}) {
  const { stage, inCanvas } = useLakon();
  if (!hasLakonContent(section.type, section.props)) return null;
  const gated = stage !== "opened" && !inCanvas && section.type !== "cover";
  return (
    <div
      data-section={section.type}
      data-section-id={section.id}
      data-section-visible={section.visible}
      inert={gated}
      aria-hidden={gated || undefined}
    >
      {children}
    </div>
  );
}

/** Reveals once per mounted block, including the native Builder scroll owner. */
export function Entrance({
  children,
  className,
  delay = 0,
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRef(false);
  const { stage, inCanvas } = useLakon();
  useEffect(() => {
    const element = ref.current;
    if (!element || stage !== "opened" || revealed.current) return;
    return observeLakonEntrance(element, {
      inCanvas,
      delay,
      stagger,
      onReveal: () => {
        revealed.current = true;
      },
    });
  }, [stage, inCanvas, delay, stagger]);
  return (
    <div ref={ref} className={className} data-lakon-entrance>
      {children}
    </div>
  );
}

export function useLakonParallax(
  ref: RefObject<HTMLElement | null>,
  distance?: number,
) {
  const { stage, inCanvas } = useLakon();
  useEffect(() => {
    if (stage !== "opened" || !ref.current || distance === undefined) return;
    return observeLakonParallax(ref.current, { inCanvas, distance });
  }, [stage, inCanvas, ref, distance]);
}

export function navigateLakon(source: HTMLElement, target: HTMLElement) {
  if (document.querySelector("dialog[open]")) return;
  const owner =
    source
      .closest<HTMLElement>("[data-device-frame-viewport]")
      ?.querySelector<HTMLElement>("[data-device-scroller]") ?? window;
  const viewport = lakonViewport(
    owner === window ? null : (owner as HTMLElement),
  );
  const top =
    (target.getBoundingClientRect().top - viewport.top) / viewport.scale +
    (owner === window ? scrollY : (owner as HTMLElement).scrollTop) -
    16;
  animateCinematicScroll(owner, top, {
    duration: 560,
    onComplete: () =>
      target
        .querySelector<HTMLElement>("h1,h2")
        ?.focus({ preventScroll: true }),
  });
}
