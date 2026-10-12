import type { NormalizedEvent } from "../events/event-data";

export const textValue = (value: unknown) =>
  typeof value === "string" ? value : "";
export const matchingText = (value: string) =>
  value.trim().replace(/\s+/g, " ");

/** Empty editable fields are valid in the existing schema; retain their records. */
export function ceremonyEvents(value: unknown): NormalizedEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const event = item as Record<string, unknown>;
    return [
      {
        name: textValue(event.name),
        date: textValue(event.date),
        venue_name: textValue(event.venue_name),
        start_time: textValue(event.start_time) || undefined,
        end_time: textValue(event.end_time) || undefined,
        address: textValue(event.address) || undefined,
        maps_url: textValue(event.maps_url) || undefined,
      },
    ];
  });
}

/** Calendar day is author-defined, independent of the browser's time zone. */
export function ceremonyDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!match) return null;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return {
    day: String(day),
    year: String(year),
    weekday: new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date),
    month: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      timeZone: "UTC",
    }).format(date),
  };
}

/** Adjacent records sharing a day/place form one card. No sorting or fixed event count. */
export function ceremonyGroups(events: readonly NormalizedEvent[]) {
  const groups: NormalizedEvent[][] = [];
  for (const event of events) {
    const previous = groups.at(-1)?.[0];
    const same =
      previous &&
      previous.date.slice(0, 10) === event.date.slice(0, 10) &&
      matchingText(previous.venue_name) === matchingText(event.venue_name) &&
      matchingText(previous.address ?? "") ===
        matchingText(event.address ?? "") &&
      previous.maps_url === event.maps_url;
    if (same) groups.at(-1)!.push(event);
    else groups.push([event]);
  }
  return groups;
}

export function ceremonyTime(start?: string, end?: string) {
  const format = (value: string) =>
    /^\d{2}:\d{2}$/.test(value) ? `${value.replace(":", ".")} WIB` : value;
  return [
    start ? format(start) : "",
    end ? format(end) : start ? "Selesai" : "",
  ]
    .filter(Boolean)
    .join(" - ");
}

export function externalLink(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function instagramProfile(value: string) {
  const handle = value.trim().replace(/^@/, "");
  if (!handle) return null;
  if (/^[A-Za-z0-9_.]+$/.test(handle))
    return {
      label: `@${handle}`,
      href: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
    };
  try {
    const url = new URL(handle);
    if (
      url.protocol !== "https:" ||
      !["www.instagram.com", "instagram.com"].includes(url.hostname)
    )
      return null;
    const name = url.pathname.split("/").filter(Boolean)[0];
    return { label: name ? `@${name}` : "Instagram", href: url.href };
  } catch {
    return null;
  }
}
