/** One initial handoff. A guest's next gesture always takes ownership of scrolling. */
export function openingHandoff(surface: HTMLElement, reducedMotion: boolean) {
  const target = surface.querySelector<HTMLElement>("[data-gp-hero-focus]");
  return target ? sectionHandoff(surface, target, reducedMotion) : () => {};
}

/** A single interruptible native scroll, shared by entry and invitation navigation. */
export function sectionHandoff(
  surface: HTMLElement,
  target: HTMLElement,
  reducedMotion: boolean,
) {
  const doc = surface.ownerDocument;
  const view = doc.defaultView;
  if (!view || !target) return () => {};
  const owner = surface.closest<HTMLElement>("[data-device-scroller]");
  const scroller = owner ?? view;
  let started = false;
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gestures = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  function cleanup() {
    started = false;
    view!.cancelAnimationFrame(frame);
    clearTimeout(timer);
    gestures.forEach((type) =>
      doc.removeEventListener(type, cancel, { capture: true }),
    );
    scroller.removeEventListener("scrollend", cleanup);
  }
  function cancel() {
    if (started && !reducedMotion)
      scroller.scrollTo({
        top: owner ? owner.scrollTop : view!.scrollY,
        behavior: "instant",
      });
    cleanup();
  }
  gestures.forEach((type) =>
    doc.addEventListener(type, cancel, { capture: true, passive: true }),
  );
  frame = view.requestAnimationFrame(() => {
    if (!target.isConnected) return cleanup();
    const top = owner
      ? target.getBoundingClientRect().top -
        owner.getBoundingClientRect().top +
        owner.scrollTop
      : target.getBoundingClientRect().top + view.scrollY;
    started = true;
    target.focus({ preventScroll: true });
    scroller.scrollTo({ top, behavior: reducedMotion ? "instant" : "smooth" });
    if (reducedMotion) cleanup();
    else {
      scroller.addEventListener("scrollend", cleanup, { once: true });
      // Only bounds listener ownership; content and music never wait for this.
      timer = setTimeout(cleanup, 1500);
    }
  });
  return cancel;
}
