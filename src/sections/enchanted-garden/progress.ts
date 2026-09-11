"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { clampJourneyProgress, getJourneyTargetProgress } from "./journey";

export interface ProgressRef {
  current: number;
}

export type JourneyScrollOwner = Window | HTMLElement;

type JourneyDocument = Pick<Document, "documentElement" | "body">;
type JourneyWindow = Pick<
  Window,
  | "scrollY"
  | "innerHeight"
  | "addEventListener"
  | "removeEventListener"
  | "requestAnimationFrame"
  | "cancelAnimationFrame"
  | "scrollTo"
>;

export interface JourneyScrollMetrics {
  scrollTop: number;
  scrollableDistance: number;
}

/** Builder resolution is intentionally strict: a missing preview owner is not
 * allowed to fall through to the host window. */
export function resolveJourneyScrollOwner(
  stage: HTMLElement,
  inCanvas: boolean,
  browserWindow: Window = window,
): JourneyScrollOwner | null {
  return inCanvas
    ? stage.closest<HTMLElement>("[data-device-scroller]")
    : browserWindow;
}

export function readJourneyScrollMetrics(
  owner: JourneyScrollOwner,
  browserWindow: JourneyWindow = window,
  browserDocument: JourneyDocument = document,
): JourneyScrollMetrics {
  if (owner === browserWindow) {
    const scrollHeight = Math.max(
      browserDocument.documentElement.scrollHeight,
      browserDocument.body?.scrollHeight ?? 0,
    );
    return {
      scrollTop: browserWindow.scrollY,
      scrollableDistance: Math.max(0, scrollHeight - browserWindow.innerHeight),
    };
  }

  const element = owner as HTMLElement;
  return {
    scrollTop: element.scrollTop,
    scrollableDistance: Math.max(
      0,
      element.scrollHeight - element.clientHeight,
    ),
  };
}

export function measureJourneyProgress(
  owner: JourneyScrollOwner,
  browserWindow: JourneyWindow = window,
  browserDocument: JourneyDocument = document,
) {
  const { scrollTop, scrollableDistance } = readJourneyScrollMetrics(
    owner,
    browserWindow,
    browserDocument,
  );
  if (scrollableDistance <= 0) return 0;
  return clampJourneyProgress(scrollTop / scrollableDistance);
}

export function gateJourneyProgressUntilOpen(
  measuredProgress: number,
  waitForOpen: boolean,
  opened: boolean,
) {
  return waitForOpen && !opened ? 0 : measuredProgress;
}

export function seekJourneyProgress(
  owner: JourneyScrollOwner,
  progress: number,
  browserWindow: JourneyWindow = window,
  browserDocument: JourneyDocument = document,
) {
  const { scrollableDistance } = readJourneyScrollMetrics(
    owner,
    browserWindow,
    browserDocument,
  );
  const top = clampJourneyProgress(progress) * scrollableDistance;
  owner.scrollTo({ top, behavior: "auto" });
}

export function seekJourneyTarget(
  owner: JourneyScrollOwner,
  sectionType: string,
  browserWindow: JourneyWindow = window,
  browserDocument: JourneyDocument = document,
) {
  const progress = getJourneyTargetProgress(sectionType);
  if (progress === undefined) return false;
  seekJourneyProgress(owner, progress, browserWindow, browserDocument);
  return true;
}

export function bindJourneyProgress(
  owner: JourneyScrollOwner,
  observedStage: HTMLElement,
  progressRef: ProgressRef,
  browserWindow: Window = window,
  browserDocument: Document = document,
  readProgress?: () => number,
) {
  let frame = 0;
  const update = () => {
    frame = 0;
    progressRef.current = readProgress
      ? readProgress()
      : measureJourneyProgress(owner, browserWindow, browserDocument);
  };
  const requestUpdate = () => {
    if (!frame) frame = browserWindow.requestAnimationFrame(update);
  };

  owner.addEventListener("scroll", requestUpdate, { passive: true });
  browserWindow.addEventListener("resize", requestUpdate, { passive: true });
  const resizeObserver = new ResizeObserver(requestUpdate);
  resizeObserver.observe(observedStage);
  const resizeTarget: Element =
    owner === browserWindow
      ? browserDocument.documentElement
      : (owner as HTMLElement);
  resizeObserver.observe(resizeTarget);
  update();

  return () => {
    owner.removeEventListener("scroll", requestUpdate);
    browserWindow.removeEventListener("resize", requestUpdate);
    resizeObserver.disconnect();
    if (frame) browserWindow.cancelAnimationFrame(frame);
  };
}

export function useJourneyProgress(
  stageRef: RefObject<HTMLElement | null>,
  inCanvas: boolean,
  waitForOpen: boolean,
) {
  const progressRef = useRef(0);
  const ownerRef = useRef<JourneyScrollOwner | null>(null);
  const openedRef = useRef(!waitForOpen);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const owner = resolveJourneyScrollOwner(stage, inCanvas);
    ownerRef.current = owner;
    stage.dataset.scrollOwner = owner
      ? inCanvas
        ? "device-frame"
        : "window"
      : "missing";
    if (!owner) return;

    openedRef.current = !waitForOpen;
    const cleanup = bindJourneyProgress(
      owner,
      stage,
      progressRef,
      window,
      document,
      () =>
        gateJourneyProgressUntilOpen(
          measureJourneyProgress(owner),
          waitForOpen,
          openedRef.current,
        ),
    );
    return () => {
      cleanup();
      ownerRef.current = null;
      delete stage.dataset.scrollOwner;
    };
  }, [inCanvas, stageRef, waitForOpen]);

  const seekToTarget = useCallback((sectionType: string) => {
    const owner = ownerRef.current;
    return owner ? seekJourneyTarget(owner, sectionType) : false;
  }, []);

  const openAtEntrance = useCallback(() => {
    openedRef.current = true;
    progressRef.current = 0;
    const owner = ownerRef.current;
    if (owner) seekJourneyProgress(owner, 0);
  }, []);

  return { progressRef, seekToTarget, openAtEntrance };
}
