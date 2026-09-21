"use client";

import { useEffect, useState, type RefObject } from "react";
import type { SceneQuality } from "./types";

const DPR_BY_QUALITY: Record<SceneQuality, number | [number, number]> = {
  high: [1, 1.5],
  medium: [1, 1.25],
  low: 1,
};

export function getSekarJawa3DDpr(quality: SceneQuality) {
  return DPR_BY_QUALITY[quality];
}

export function getSekarJawa3DQuality(
  width: number,
  height: number,
  inCanvas: boolean,
): SceneQuality {
  if (width <= 480 || height <= 520) return "low";
  if (inCanvas) {
    return width >= 1100 && height >= 650 ? "high" : "medium";
  }
  return width >= 960 && height >= 650 ? "high" : "medium";
}

export function useSekarJawa3DQuality(
  viewportRef: RefObject<HTMLElement | null>,
  inCanvas: boolean,
) {
  const [quality, setQuality] = useState<SceneQuality>("low");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const next = getSekarJawa3DQuality(
        viewport.clientWidth,
        viewport.clientHeight,
        inCanvas,
      );
      setQuality((current) => (current === next ? current : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    update();
    return () => observer.disconnect();
  }, [inCanvas, viewportRef]);

  return quality;
}
