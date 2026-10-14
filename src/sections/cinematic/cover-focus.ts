/** Keep the closed cinematic gate's underlying invitation out of keyboard order. */
export function containCinematicCover(cover: HTMLElement) {
  const invitation = cover.closest<HTMLElement>(".cinematic-invitation");
  if (!invitation) return;
  const siblings = Array.from(invitation.children).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && !node.contains(cover),
  );
  const previous = siblings.map((node) => node.inert);
  siblings.forEach((node) => { node.inert = true; });
  const button = cover.querySelector<HTMLButtonElement>("button");
  button?.focus({ preventScroll: true });
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    button?.focus();
    button?.scrollIntoView({ block: "nearest", behavior: "instant" });
  };
  cover.addEventListener("keydown", onKey);
  return () => {
    siblings.forEach((node, index) => { node.inert = previous[index]; });
    cover.removeEventListener("keydown", onKey);
  };
}
