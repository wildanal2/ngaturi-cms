"use client";

import { useEffect, useState, type RefObject } from "react";
import type { SceneQuality } from "./types";

export function getEnchantedGardenQuality(
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

export function useEnchantedGardenQuality(
  viewportRef: RefObject<HTMLElement | null>,
  inCanvas: boolean,
) {
  const [quality, setQuality] = useState<SceneQuality>(
    inCanvas ? "low" : "medium",
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const next = getEnchantedGardenQuality(
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
