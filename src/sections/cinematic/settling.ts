import {
  animateCinematicScroll,
  cancelCinematicScroll,
  isCinematicScrolling,
} from "./scroll";

const FORM_CONTROL =
  'input, textarea, select, form button, [contenteditable]:not([contenteditable="false"])';
const PROTECTED = `${FORM_CONTROL}, button, a[href], summary, [data-cinematic-interaction], [data-cinematic-pager], [data-invitation-cover]`;

/** Idle assistance only after manual input. The timeline supplies the resting beat. */
export function mountCinematicSettling(
  root: HTMLElement,
  scroller: HTMLElement | null,
  target: () => number | null,
) {
  const owner = scroller ?? window;
  const invitation = root.closest<HTMLElement>(".cinematic-invitation") ?? root;
  const automatic = () =>
    invitation.dataset?.cinematicAutoState === "running" ||
    invitation.dataset?.cinematicAutoState === "waiting";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const top = () => (scroller ? scroller.scrollTop : window.scrollY);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let manual = false;
  let held = false;
  let touching = false;
  let blocked = false;
  let origin = top();
  let observed = origin;
  let moved = false;
  const protectedNode = (node: EventTarget | null) =>
    node instanceof HTMLElement && !!node.closest(PROTECTED);
  const editing = () =>
    document.activeElement instanceof HTMLElement &&
    !!document.activeElement.closest(FORM_CONTROL);
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    cancelCinematicScroll(owner, "settle");
    manual = false;
    moved = false;
  };
  const onScroll = () => {
    const current = top();
    if (automatic() || isCinematicScrolling(owner)) {
      observed = current;
      return;
    }
    clearTimeout(timer);
    moved ||= Math.abs(current - origin) > 0.5;
    observed = current;
    if (!manual || !moved || held || blocked || reduced.matches || editing())
      return;
    timer = setTimeout(() => {
      timer = undefined;
      manual = false;
      if (automatic() || blocked || held || reduced.matches || editing()) return;
      const destination = target();
      if (destination === null || Math.abs(destination - top()) < 2) return;
      animateCinematicScroll(owner, destination, { duration: 450, kind: "settle" });
    }, 300);
  };
  const input = (event: Event) => {
    if (
      event instanceof KeyboardEvent &&
      ![
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        " ",
      ].includes(event.key)
    )
      return;
    cancel();
    if (event.type === "touchstart") touching = true;
    // Passive wheel delivery may follow compositor scrolling, before its scroll event.
    origin =
      event.type === "wheel" || event.type === "keydown" ? observed : top();
    blocked = protectedNode(event.target) || editing();
    held = event.type === "touchstart" || event.type === "pointerdown";
    manual = !blocked && !reduced.matches;
  };
  const release = () => {
    held = false;
    touching = false;
    onScroll();
  };
  const abortTouch = () => {
    touching = false;
    held = false;
    cancel();
  };
  const cancelPointer = () => {
    // Native touch panning cancels Pointer Events while Touch Events continue.
    if (!touching) {
      held = false;
      cancel();
    }
  };
  const focus = () => {
    if (editing()) cancel();
  };
  const events = ["wheel", "touchstart", "pointerdown", "keydown"];
  events.forEach((name) =>
    owner.addEventListener(name, input, { passive: true }),
  );
  owner.addEventListener("touchend", release, { passive: true });
  owner.addEventListener("touchcancel", abortTouch, { passive: true });
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", cancelPointer);
  document.addEventListener("focusin", focus);
  // Programmatic navigation must cancel assistance before either stage seeks.
  invitation.addEventListener("cinematic:seek", cancel, true);
  invitation.addEventListener("cinematic:auto-start", cancel);
  return {
    onScroll,
    cancel,
    dispose() {
      cancel();
      events.forEach((name) => owner.removeEventListener(name, input));
      owner.removeEventListener("touchend", release);
      owner.removeEventListener("touchcancel", abortTouch);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", cancelPointer);
      document.removeEventListener("focusin", focus);
      invitation.removeEventListener("cinematic:seek", cancel, true);
      invitation.removeEventListener("cinematic:auto-start", cancel);
    },
  };
}
