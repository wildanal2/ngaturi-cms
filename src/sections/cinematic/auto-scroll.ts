import {
  animateCinematicScroll,
  cancelCinematicScroll,
  cinematicScrollTop,
} from "./scroll";
import type { CinematicAutoStop } from "./auto-scroll-plan";

type AutoState = "idle" | "waiting" | "running" | "paused" | "finished";
const CONTROL =
  'input, textarea, select, button, a[href], summary, [contenteditable]:not([contenteditable="false"])';

/** One presentation per visit. Manual intent yields permanently to native scrolling. */
export function mountCinematicAutoScroll(
  root: HTMLElement,
  scroller: HTMLElement | null,
  {
    cover,
    plan,
  }: { cover: HTMLElement; plan: () => CinematicAutoStop[] | null },
) {
  const owner = scroller ?? window;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let state: AutoState =
    root.dataset.cinematicAutoState &&
    root.dataset.cinematicAutoState !== "idle"
      ? "paused"
      : "idle";
  let attempted = state !== "idle";
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let readySince: number | undefined;
  const visited = new Set<string>();
  const setState = (next: AutoState) => {
    state = next;
    root.dataset.cinematicAutoState = next;
  };
  setState(state);
  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(timer);
    timer = undefined;
    cancelCinematicScroll(owner, "auto");
  };
  const pause = () => {
    if (state !== "waiting" && state !== "running") return;
    setState("paused");
    clear();
    observer.disconnect();
  };
  const editing = () => {
    const active = document.activeElement;
    return (
      active instanceof HTMLElement &&
      root.contains(active) &&
      !active.closest("[data-invitation-cover]") &&
      !!active.closest(CONTROL)
    );
  };
  const finish = () => {
    setState("finished");
    clear();
  };
  const advance = () => {
    if (state !== "running") return;
    if (reduced.matches || editing()) {
      pause();
      return;
    }
    const route = plan();
    if (!route?.length) {
      pause();
      return;
    }
    const stop = route.find((point) => !visited.has(point.id));
    if (!stop) {
      finish();
      return;
    }
    // Cover has already positioned entry. Never rewind after native restoration/layout changes.
    if (stop.position < cinematicScrollTop(owner) - 2) {
      visited.add(stop.id);
      advance();
      return;
    }
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      root.contains(active) &&
      active.matches("h1, h2")
    )
      active.blur();
    const arrive = () => {
      if (state !== "running") return;
      // Media can change a tall traversal's measured end while the camera is travelling.
      const measured = plan()?.find((point) => point.id === stop.id);
      if (measured && measured.position > cinematicScrollTop(owner) + 2) {
        advance();
        return;
      }
      visited.add(stop.id);
      if (stop.final) {
        finish();
        return;
      }
      timer = setTimeout(advance, stop.holdMs);
    };
    animateCinematicScroll(owner, stop.position, {
      kind: "auto",
      duration: stop.travelMs,
      easing: stop.reading ? "linear" : undefined,
      onComplete: arrive,
    });
  };
  const waitForOpening = () => {
    frame = 0;
    if (state !== "waiting") return;
    if (reduced.matches || editing()) {
      pause();
      return;
    }
    if (cover.hidden && cover.dataset.open === "1") {
      readySince ??= performance.now();
      if (plan()?.length) {
        observer.disconnect();
        setState("running");
        root.dispatchEvent(new Event("cinematic:auto-start"));
        advance();
        return;
      }
      // Enhancement failure leaves the invitation manually usable, never blocked.
      if (performance.now() - readySince > 2500) {
        pause();
        return;
      }
    }
    frame = requestAnimationFrame(waitForOpening);
  };
  const observer = new MutationObserver(() => {
    if (state === "waiting" && !frame)
      frame = requestAnimationFrame(waitForOpening);
  });
  const open = () => {
    if (attempted) return;
    attempted = true;
    setState("waiting");
    observer.observe(cover, {
      attributes: true,
      attributeFilter: ["hidden", "data-open"],
    });
    frame = requestAnimationFrame(waitForOpening);
  };
  const focus = () => {
    if (editing()) pause();
  };
  const visibility = () => {
    if (document.hidden) pause();
  };
  const media = () => {
    if (reduced.matches) pause();
  };
  const events = ["wheel", "touchstart", "pointerdown", "keydown"];
  // Match the native driver's cancellation, including Tab and modifier keys.
  events.forEach((name) =>
    owner.addEventListener(name, pause, { passive: true, capture: true }),
  );
  root.addEventListener("cinematic:seek", pause, true);
  document.addEventListener("focusin", focus);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("resize", pause);
  reduced.addEventListener("change", media);
  window.addEventListener("ngaturi:open", open);
  return {
    pause,
    get state() {
      return state;
    },
    dispose() {
      pause();
      clear();
      observer.disconnect();
      events.forEach((name) => owner.removeEventListener(name, pause, true));
      root.removeEventListener("cinematic:seek", pause, true);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("resize", pause);
      reduced.removeEventListener("change", media);
      window.removeEventListener("ngaturi:open", open);
      if (state === "idle") delete root.dataset.cinematicAutoState;
    },
  };
}
