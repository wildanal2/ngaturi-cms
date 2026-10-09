export type CinematicDestination = {
  type: string;
  label: string;
  icon: string;
};
const JOURNEY: CinematicDestination[] = [
  { type: "hero", label: "Awal", icon: "Home" },
  { type: "couple-intro", label: "Mempelai", icon: "Users" },
  { type: "quote", label: "Kutipan", icon: "Heart" },
  { type: "story", label: "Perjalanan Kami", icon: "HeartHandshake" },
  { type: "countdown", label: "Hari Bahagia", icon: "Timer" },
  { type: "gallery", label: "Kenangan", icon: "Images" },
  { type: "event-details", label: "Acara", icon: "CalendarClock" },
  { type: "map-location", label: "Lokasi", icon: "MapPin" },
  { type: "rsvp", label: "RSVP", icon: "CircleCheck" },
  { type: "gift", label: "Tanda Kasih", icon: "Gift" },
  { type: "guestbook", label: "Doa & Ucapan", icon: "MessageCircleHeart" },
  { type: "closing", label: "Penutup", icon: "Heart" },
];
export function cinematicDestinations(types: string[], rendered = false) {
  const available = JOURNEY.filter((item) => types.includes(item.type));
  return rendered
    ? available.sort((a, b) => types.indexOf(a.type) - types.indexOf(b.type))
    : available;
}
export function cinematicRoot(source: HTMLElement) {
  return (
    source.closest<HTMLElement>(".cinematic-invitation") ??
    source
      .closest("[data-device-frame-viewport]")
      ?.querySelector<HTMLElement>(".cinematic-invitation") ??
    null
  );
}
