"use client";

import { useSyncExternalStore } from "react";

type Tab = "rsvp" | "wishes";
type Snapshot = {
  active: Tab;
  paired: boolean;
  formTarget: HTMLElement | null;
  listTarget: HTMLElement | null;
};
const empty: Snapshot = {
  active: "rsvp",
  paired: false,
  formTarget: null,
  listTarget: null,
};

/** Presentation coordinates only. No form values, submission state or API belongs here. */
export function createGerbangFormSurface(active: Tab = "rsvp") {
  let snapshot: Snapshot = { ...empty, active };
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => empty,
    update: (patch: Partial<Snapshot>) => {
      if (
        Object.entries(patch).every(
          ([key, value]) => snapshot[key as keyof Snapshot] === value,
        )
      )
        return;
      snapshot = { ...snapshot, ...patch };
      listeners.forEach((listener) => listener());
    },
  };
}
export type GerbangFormSurface = ReturnType<typeof createGerbangFormSurface>;
export const gerbangFormOwners = new WeakMap<HTMLElement, GerbangFormSurface>();
const noopSubscribe = () => () => {};
const emptySnapshot = () => empty;
export function useGerbangFormSurface(surface?: GerbangFormSurface | null) {
  return useSyncExternalStore(
    surface?.subscribe ?? noopSubscribe,
    surface?.getSnapshot ?? emptySnapshot,
    surface?.getServerSnapshot ?? emptySnapshot,
  );
}
