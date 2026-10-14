type ScrollOwner = Window | HTMLElement;
type TravelOptions = {
  duration?: number;
  kind?: "seek" | "settle" | "auto";
  easing?: "linear";
  onComplete?: () => void;
  onFrame?: () => void;
};
const travel = new WeakMap<
  ScrollOwner,
  {
    cancel: () => void;
    kind: NonNullable<TravelOptions["kind"]>;
  }
>();

export function cancelCinematicScroll(
  owner: ScrollOwner,
  kind?: TravelOptions["kind"],
) {
  const current = travel.get(owner);
  if (current && (!kind || current.kind === kind)) current.cancel();
}
export function isCinematicScrolling(owner: ScrollOwner) {
  return travel.has(owner);
}
export function cinematicScrollTop(owner: ScrollOwner) {
  return owner === window ? window.scrollY : (owner as HTMLElement).scrollTop;
}

/** One interruptible journey per native scroll owner; GSAP follows owner position. */
export function animateCinematicScroll(
  owner: ScrollOwner,
  destination: number,
  options: TravelOptions = {},
) {
  cancelCinematicScroll(owner);
  const from = cinematicScrollTop(owner);
  const height =
    owner === window ? window.innerHeight : (owner as HTMLElement).clientHeight;
  const duration =
    options.duration ??
    Math.max(
      700,
      Math.min(1400, (Math.abs(destination - from) / height) * 400),
    );
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches || duration === 0 || Math.abs(destination - from) < 1) {
    owner.scrollTo({ top: destination, behavior: "instant" });
    options.onFrame?.();
    options.onComplete?.();
    return;
  }
  let frame = 0;
  let began: number | undefined;
  const cancel = () => {
    cancelAnimationFrame(frame);
    reduced.removeEventListener("change", cancel);
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((name) =>
      owner.removeEventListener(name, cancel),
    );
    travel.delete(owner);
  };
  travel.set(owner, { cancel, kind: options.kind ?? "seek" });
  reduced.addEventListener("change", cancel);
  ["wheel", "touchstart", "pointerdown", "keydown"].forEach((name) =>
    owner.addEventListener(name, cancel, { passive: true }),
  );
  const animate = (now: number) => {
    began ??= now;
    const progress = Math.min(1, (now - began) / duration);
    const eased =
      options.easing === "linear"
        ? progress
        : progress < 0.5
          ? 4 * progress ** 3
          : 1 - (-2 * progress + 2) ** 3 / 2;
    owner.scrollTo({
      top: from + (destination - from) * eased,
      behavior: "instant",
    });
    options.onFrame?.();
    if (progress < 1) frame = requestAnimationFrame(animate);
    else {
      cancel();
      options.onComplete?.();
    }
  };
  frame = requestAnimationFrame(animate);
}

export type CinematicSeekDetail =
  string | { sectionId: string; behavior: "smooth" | "instant" };
export function focusCinematicChapter(section: HTMLElement) {
  const heading = section.querySelector<HTMLElement>("h1, h2");
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}
