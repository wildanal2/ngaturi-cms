import type { SectionData } from "../types";
import {
  normalizeEventDetails,
  eventCalendarUrl,
  type NormalizedEvent,
} from "../events/event-data";

export const LAKON_ID = "lakon-kencana";
export const LAKON_ASSETS = "/themes/lakon-kencana";
export const LAKON_OPEN_MS = 900;

// Pure display formatting; importing shared.tsx also imports unrelated theme CSS.
export function lakonTimeRange(start?: string, end?: string) {
  return start ? (end ? `${start} – ${end} WIB` : `${start} WIB`) : "";
}

export function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}
export function externalUrl(value: unknown) {
  try {
    const url = new URL(text(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function imageUrl(value: unknown) {
  const src = text(value);
  return src.startsWith("/") && !src.startsWith("//") ? src : externalUrl(src);
}
export function splitNames(value: string) {
  const names = (
    value.includes("&")
      ? value.split(/\s*&\s*/)
      : value.split(/\s+(?:dan|and)\s+/i)
  ).filter(Boolean);
  return names.length === 2 ? names : [value];
}
export function calendarDay(value: string) {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1];
  if (!day) return "";
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return day;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  // Builder datetime-local values are saved as ISO instants. Show the event's
  // Indonesian day independently of a guest's device timezone.
  const day = calendarDay(value);
  const date = day ? new Date(`${day}T12:00:00Z`) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        ...options,
        timeZone: "UTC",
      }).format(date)
    : "";
}
export function targetTimestamp(date: string, time?: string) {
  const day = calendarDay(date);
  if (!day) return NaN;
  // Events store their day and local start time separately, matching calendar actions.
  if (time && /^\d{2}:\d{2}$/.test(time))
    return Date.parse(`${day}T${time}:00+07:00`);
  return Date.parse(
    date.length === 10
      ? `${day}T00:00:00+07:00`
      : /(?:Z|[+-]\d{2}:?\d{2})$/.test(date)
        ? date
        : `${date}+07:00`,
  );
}
export function guestLimit(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(20, Math.floor(n))) : 2;
}
export function lakonCalendarUrl(event: NormalizedEvent) {
  return eventCalendarUrl({ ...event, date: calendarDay(event.date) });
}
export function hasLakonKencana(sections: readonly SectionData[]) {
  return sections.some((s) => s.visible !== false && s.variant === LAKON_ID);
}
export function primaryLakonEvent(sections: readonly SectionData[]) {
  return [...sections]
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.type === "event-details")
    .flatMap((s) => normalizeEventDetails(s.props.events))
    .find((e) => Number.isFinite(targetTimestamp(e.date, e.start_time)));
}
export const LAKON_NAV = [
  ["hero", "Awal", "Home"],
  ["couple-intro", "Mempelai", "Users"],
  ["event-details", "Acara", "CalendarDays"],
  ["map-location", "Lokasi", "MapPin"],
  ["gallery", "Galeri", "Images"],
  ["rsvp", "RSVP", "CircleCheck"],
] as const;

/** Empty optional content has neither a blank chapter nor a navigation destination. */
export function hasLakonContent(type: string, props: Record<string, unknown>) {
  switch (type) {
    case "couple-intro":
      return [record(props.groom), record(props.bride)].some(
        (p) => text(p.name) || text(p.full_name),
      );
    case "story":
      return records(props.items).some(
        (i) => text(i.title) || text(i.description),
      );
    case "quote":
      return !!text(props.text);
    case "gallery":
      return records(props.images).some((i) => !!imageUrl(i.url));
    case "gift":
      return records(props.bank_accounts).some(
        (i) => text(i.account_number) && text(i.bank_name),
      );
    case "map-location":
      return !!(
        text(props.venue_name) ||
        text(props.address) ||
        externalUrl(props.maps_url) ||
        externalUrl(props.embed_url)
      );
    case "event-details":
      return normalizeEventDetails(props.events).length > 0;
    default:
      return true;
  }
}
