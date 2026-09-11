"use client";

import { useEffect, useRef, type RefObject } from "react";
import { clampJourneyProgress } from "./journey";

export interface ProgressRef {
  current: number;
}

export type JourneyScrollOwner = Window | HTMLElement;

function isWindowOwner(owner: JourneyScrollOwner): owner is Window {
  return owner === window;
}

export function measureJourneyProgress(
  owner: JourneyScrollOwner,
  stage: HTMLElement,
) {
  const windowOwner = isWindowOwner(owner);
  const scrollTop = windowOwner ? window.scrollY : owner.scrollTop;
  const viewportHeight = windowOwner ? window.innerHeight : owner.clientHeight;
  const stageTop = windowOwner
    ? stage.getBoundingClientRect().top + window.scrollY
    : stage.getBoundingClientRect().top -
      owner.getBoundingClientRect().top +
      owner.scrollTop;
  const distance = Math.max(1, stage.offsetHeight - viewportHeight);
  return clampJourneyProgress((scrollTop - stageTop) / distance);
}

export function bindJourneyProgress(
  owner: JourneyScrollOwner,
  stage: HTMLElement,
  progressRef: ProgressRef,
) {
  let frame = 0;
  const update = () => {
    frame = 0;
    progressRef.current = measureJourneyProgress(owner, stage);
  };
  const requestUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  owner.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  const resizeObserver = new ResizeObserver(requestUpdate);
  resizeObserver.observe(stage);
  if (!isWindowOwner(owner)) resizeObserver.observe(owner);
  update();

  return () => {
    owner.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
    resizeObserver.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  };
}

/** Public defaults to window; Phase 5 can supply the DeviceFrame scroll owner. */
export function useJourneyProgress(
  stageRef: RefObject<HTMLElement | null>,
  owner?: HTMLElement | null,
) {
  const progressRef = useRef(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    return bindJourneyProgress(owner ?? window, stage, progressRef);
  }, [owner, stageRef]);

  return progressRef;
}
