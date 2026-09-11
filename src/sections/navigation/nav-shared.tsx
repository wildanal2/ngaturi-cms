"use client";

import * as Icons from "lucide-react";

export type NavTarget = { type: string; label: string; icon: string };

export const NAV_TARGETS: NavTarget[] = [
  { type: "hero", label: "Atas", icon: "Home" },
  { type: "couple-intro", label: "Mempelai", icon: "Users" },
  { type: "event-details", label: "Acara", icon: "CalendarClock" },
  { type: "countdown", label: "Hitung Mundur", icon: "Timer" },
  { type: "gallery", label: "Galeri", icon: "Images" },
  { type: "map-location", label: "Lokasi", icon: "MapPin" },
  { type: "rsvp", label: "RSVP", icon: "CircleCheck" },
  { type: "guestbook", label: "Ucapan", icon: "MessageCircleHeart" },
  { type: "gift", label: "Hadiah", icon: "Gift" },
];

export function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const C = (
    Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>
  )[name];
  return C ? <C size={size} /> : null;
}

/** The sections present in this invitation, in target order, capped. */
export function useNavItems(siblingTypes: string[] = [], max = 6): NavTarget[] {
  return NAV_TARGETS.filter((t) => siblingTypes.includes(t.type)).slice(0, max);
}

export function dispatchCompositionSeek(section: HTMLElement, type: string) {
  const cinematicStage = section.closest("[data-cinematic-stage]");
  if (cinematicStage && section.dataset.sectionId) {
    const seek = new CustomEvent("cinematic:seek", {
      detail: section.dataset.sectionId,
      cancelable: true,
    });
    if (!cinematicStage.dispatchEvent(seek)) return true;
  }

  const enchantedStage = section.closest("[data-enchanted-garden-stage]");
  if (enchantedStage) {
    const navigate = new CustomEvent("enchanted-garden:navigate", {
      detail: type,
      cancelable: true,
    });
    if (!enchantedStage.dispatchEvent(navigate)) return true;
  }
  return false;
}

/** Uses each composition's existing scroll runtime publicly. In Builder only
 * Enchanted Garden opts into local navigation; the other preview paths retain
 * their existing behavior. */
export function scrollToSection(
  type: string,
  inCanvas?: boolean,
  source?: HTMLElement,
) {
  if (inCanvas) {
    const viewport = source?.closest<HTMLElement>(
      "[data-device-frame-viewport]",
    );
    const scroller = viewport?.querySelector<HTMLElement>(
      "[data-device-scroller]",
    );
    const section = scroller?.querySelector<HTMLElement>(
      `[data-section="${type}"]`,
    );
    if (!scroller || !section) return;
    if (
      section.closest("[data-enchanted-garden-stage]") &&
      dispatchCompositionSeek(section, type)
    )
      return;
    if (!section.closest("[data-enchanted-garden-simple]")) return;

    const top =
      section.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;
    scroller.scrollTo({ top, behavior: "smooth" });
    return;
  }

  const section = document.querySelector<HTMLElement>(
    `[data-section="${type}"]`,
  );
  if (!section || dispatchCompositionSeek(section, type)) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}
