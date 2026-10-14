"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LoadingContext, type LoadingPhase } from "./context";
import { loadingAssetProviders } from "./assets";
import {
  LOADING_DISSOLVE_MS,
  startLoading,
  waitForCriticalAssets,
} from "./readiness";
import styles from "./loading.module.css";

const subscribe = () => () => {};
const clientEntry = () => false;
const serverEntry = () => true;

/** Entry-only gate. It never replaces/remounts the underlying invitation. */
export function InvitationLoadingBoundary({
  profile,
  visual,
  children,
}: {
  profile: string;
  visual: ReactNode;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<LoadingPhase>("pending");
  const hydratedEntry = useRef(
    useSyncExternalStore(subscribe, clientEntry, serverEntry),
  );
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const initialProfile = useRef(profile);
  const complete = useRef(false);

  useEffect(() => {
    if (complete.current || !root.current) return;
    const content = root.current;
    let disposed = false;
    let dissolve: ReturnType<typeof setTimeout> | undefined;
    // Count server-rendered visible time too; hydration must not add a second
    // full wait budget on a slow first visit.
    const painted = hydratedEntry.current
      ? performance
          .getEntriesByType?.("paint")
          .find((entry) => entry.name === "first-contentful-paint")
      : undefined;
    const elapsed = painted
      ? Math.max(0, performance.now() - painted.startTime)
      : 0;
    const cancel = startLoading(
      (signal) =>
        waitForCriticalAssets(
          loadingAssetProviders[initialProfile.current]?.(content) ?? {},
          signal,
        ),
      () => {
        if (disposed) return;
        const finish = () => {
          if (disposed) return;
          complete.current = true;
          setPhase("complete");
        };
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          finish();
        else {
          setPhase("leaving");
          dissolve = setTimeout(finish, LOADING_DISSOLVE_MS);
        }
      },
      elapsed,
    );
    return () => {
      disposed = true;
      cancel();
      clearTimeout(dissolve);
    };
  }, []);

  const active = phase !== "complete";
  useEffect(() => {
    if (!active) {
      // Cinematic Cover owns its own focus handoff. Support the external legacy
      // cover and cover-less entries without changing their lifecycle.
      const target =
        root.current?.querySelector<HTMLElement>(
          '[data-invitation-cover][data-open="0"] button',
        ) ??
        root.current?.querySelector<HTMLElement>(
          "[data-cinematic-opening-focus]",
        );
      target?.focus({ preventScroll: true });
      return;
    }
    const screen = overlay.current?.querySelector<HTMLElement>(
      "[data-loading-screen]",
    );
    screen?.focus({ preventScroll: true });
    const page = document.documentElement;
    const previousOverflow = page.style.overflow;
    page.style.overflow = "hidden";
    const prevent = (event: Event) => event.preventDefault();
    const onKey = (event: KeyboardEvent) => {
      if (
        [
          "Tab",
          " ",
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
        ].includes(event.key)
      ) {
        event.preventDefault();
        screen?.focus({ preventScroll: true });
      }
    };
    screen?.addEventListener("wheel", prevent, { passive: false });
    screen?.addEventListener("touchmove", prevent, { passive: false });
    screen?.addEventListener("keydown", onKey);
    return () => {
      page.style.overflow = previousOverflow;
      screen?.removeEventListener("wheel", prevent);
      screen?.removeEventListener("touchmove", prevent);
      screen?.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <LoadingContext value={phase}>
      <div
        className={styles.entry}
        data-invitation-entry
        data-loading-state={phase}
      >
        <div
          ref={root}
          className={styles.content}
          inert={active}
          aria-hidden={active || undefined}
          aria-busy={active || undefined}
        >
          {children}
        </div>
        <div ref={overlay}>{visual}</div>
      </div>
    </LoadingContext>
  );
}
