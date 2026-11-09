/** Lakon-only progressive motion. The resting DOM is always fully visible. */
const ease = "cubic-bezier(.22,1,.36,1)";
const noop = () => {};

export function observeLakonEntrance(
  element: HTMLElement,
  {
    inCanvas = false,
    delay = 0,
    stagger = false,
    onReveal = noop,
  }: {
    inCanvas?: boolean;
    delay?: number;
    stagger?: boolean;
    onReveal?: () => void;
  } = {},
) {
  const owner = element.closest<HTMLElement>("[data-device-scroller]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (
    (inCanvas && !owner) ||
    reduced.matches ||
    document.hidden ||
    typeof IntersectionObserver === "undefined" ||
    typeof element.animate !== "function"
  )
    return noop;

  let revealed = false;
  const animations: Animation[] = [];
  let observer: IntersectionObserver | undefined;
  const settle = () => {
    if (!revealed) onReveal();
    revealed = true;
    observer?.disconnect();
    animations.forEach((animation) => animation.cancel());
  };
  const preference = () => {
    if (reduced.matches || document.hidden) settle();
  };
  const editing = (target: Element | null) =>
    target?.matches("input,textarea,select,[contenteditable=true]");
  const focus = (event: Event) => {
    if (editing(event.target as Element)) settle();
  };
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    onReveal();
    observer?.disconnect();
    if (
      reduced.matches ||
      document.hidden ||
      (editing(document.activeElement) &&
        element.contains(document.activeElement))
    )
      return;
    const items = stagger
      ? [...element.querySelectorAll<HTMLElement>("[data-lakon-reveal-item]")]
      : [];
    for (const [index, target] of (items.length
      ? items
      : [element]
    ).entries()) {
      // Hidden fan photos and elements in a closed disclosure stay native.
      if (!target.getClientRects().length || target.closest("[hidden]"))
        continue;
      try {
        const animation = target.animate(
          [
            { opacity: 0.25, transform: "translateY(20px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 600,
            delay: Math.min(240, Math.max(0, delay) + index * 90),
            easing: ease,
            fill: "backwards",
          },
        );
        animation.id = "lakon-entrance";
        animations.push(animation);
      } catch {
        // An unavailable/failed animation API must never hide authored content.
      }
    }
  };
  try {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      },
      // A zero threshold also admits tall form/story blocks in short Canvases.
      { root: owner, rootMargin: "0px 0px -24px 0px", threshold: 0 },
    );
    observer.observe(element);
  } catch {
    observer?.disconnect();
    return noop;
  }
  reduced.addEventListener("change", preference);
  document.addEventListener("visibilitychange", preference);
  element.addEventListener("focusin", focus);
  return () => {
    observer?.disconnect();
    animations.forEach((animation) => animation.cancel());
    reduced.removeEventListener("change", preference);
    document.removeEventListener("visibilitychange", preference);
    element.removeEventListener("focusin", focus);
  };
}

/** Event-driven decoration only; no self-scheduling animation loop. */
export function observeLakonParallax(
  element: HTMLElement,
  {
    inCanvas = false,
    distance = 12,
  }: { inCanvas?: boolean; distance?: number },
) {
  const owner = element.closest<HTMLElement>("[data-device-scroller]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (
    (inCanvas && !owner) ||
    reduced.matches ||
    typeof IntersectionObserver === "undefined"
  )
    return noop;
  const source = owner ?? window;
  const initial = element.style.translate;
  let visible = false;
  let listening = false;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const viewport = owner?.getBoundingClientRect();
    const top = viewport?.top ?? 0;
    const height = viewport?.height ?? innerHeight;
    const box = element.getBoundingClientRect();
    if (!box.height || !height) return;
    const scale = owner && owner.clientHeight ? height / owner.clientHeight : 1;
    // Remove our previous translation before deriving position (no feedback).
    const offset =
      (parseFloat(element.style.translate.split(" ")[1]) || 0) * scale;
    const progress = Math.max(
      -1,
      Math.min(
        1,
        (box.top - offset + box.height / 2 - top - height / 2) / height,
      ),
    );
    element.style.translate = `0 ${(-progress * distance).toFixed(2)}px`;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const sync = () => {
    const active = visible && !reduced.matches && !document.hidden;
    if (active && !listening) {
      source.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      listening = true;
      schedule();
    } else if (!active) {
      source.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      listening = false;
      cancelAnimationFrame(frame);
      frame = 0;
      element.style.translate = initial;
    }
  };
  let observer: IntersectionObserver;
  try {
    observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { root: owner, threshold: 0 },
    );
    observer.observe(element);
  } catch {
    return noop;
  }
  reduced.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  return () => {
    observer.disconnect();
    visible = false;
    sync();
    reduced.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
  };
}
