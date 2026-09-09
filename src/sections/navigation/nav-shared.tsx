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
  const C = (Icons as unknown as Record<
    string,
    React.ComponentType<{ size?: number }>
  >)[name];
  return C ? <C size={size} /> : null;
}

/** The sections present in this invitation, in target order, capped. */
export function useNavItems(siblingTypes: string[] = [], max = 6): NavTarget[] {
  return NAV_TARGETS.filter((t) => siblingTypes.includes(t.type)).slice(0, max);
}

/** Smooth-scroll to a section on the live page (no-op in the builder). */
export function scrollToSection(type: string, inCanvas?: boolean) {
  if (inCanvas) return;
  const section = document.querySelector<HTMLElement>(`[data-section="${type}"]`);
  const stage = section?.closest('[data-cinematic-stage]');
  if (stage && section?.dataset.sectionId) {
    const seek = new CustomEvent('cinematic:seek', { detail: section.dataset.sectionId, cancelable: true });
    if (!stage.dispatchEvent(seek)) return;
  }
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}
