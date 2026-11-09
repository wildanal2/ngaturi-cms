export type OpeningStage = "closed" | "opening" | "opened";
export const GP_OPENING_MS = 1100;

/** One gesture owns entry. The timer is a completion fallback, never readiness. */
export function createOpeningLifecycle(
  initial: OpeningStage,
  publish: (stage: OpeningStage) => void,
) {
  let stage = initial;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const complete = () => {
    if (stage !== "opening") return;
    clearTimeout(timer);
    stage = "opened";
    publish(stage);
  };
  return {
    getStage: () => stage,
    begin: (gesture: () => void, reducedMotion = false) => {
      if (stage !== "closed") return false;
      stage = "opening";
      // Native music authorization must remain inside this synchronous gesture.
      // A player/listener failure cannot prevent entry.
      try {
        gesture();
      } catch {
        // Opening has no dependency on playback success.
      }
      publish(stage);
      if (reducedMotion) complete();
      else timer = setTimeout(complete, GP_OPENING_MS);
      return true;
    },
    complete,
    cancel: () => clearTimeout(timer),
  };
}

/** A closed cover always starts at its invitation, including reload and bfcache.
 * Only entry owns this correction. Release before accepting ordinary scrolling. */
export function holdClosedEntry(surface: HTMLElement) {
  const view = surface.ownerDocument.defaultView;
  if (!view) return () => {};
  const previous = view.history.scrollRestoration;
  view.history.scrollRestoration = "manual";
  const align = () => {
    view.scrollTo({
      top: surface.getBoundingClientRect().top + view.scrollY,
      behavior: "instant",
    });
  };
  align();
  const frame = view.requestAnimationFrame(align);
  view.addEventListener("pageshow", align);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    view.cancelAnimationFrame(frame);
    view.removeEventListener("pageshow", align);
    view.history.scrollRestoration = previous;
  };
}
