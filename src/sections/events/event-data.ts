export interface NormalizedEvent {
  name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  venue_name: string;
  address?: string;
  maps_url?: string;
}

const stringValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

/** A defensive view over the existing event-details schema. Order is retained;
 * Ngaturi consistently treats the first configured event as the primary one. */
export function normalizeEventDetails(value: unknown): NormalizedEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const event = item as Record<string, unknown>;
    const name = stringValue(event.name);
    const date = stringValue(event.date);
    const venueName = stringValue(event.venue_name);
    if (!name || !date || !venueName) return [];
    return [
      {
        name,
        date,
        venue_name: venueName,
        start_time: stringValue(event.start_time),
        end_time: stringValue(event.end_time),
        address: stringValue(event.address),
        maps_url: stringValue(event.maps_url),
      },
    ];
  });
}

export function primaryEventDate(events: readonly NormalizedEvent[]) {
  return events[0]?.date;
}

function compactDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[1]}${match[2]}${match[3]}` : undefined;
}

function compactTime(time?: string) {
  const match = /^(\d{2}):(\d{2})/.exec(time ?? "");
  return match ? `${match[1]}${match[2]}00` : undefined;
}

/** Matches the existing Google Calendar action while filling it from the same
 * event record when a complete start/end range is available. */
export function eventCalendarUrl(event: NormalizedEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
  });
  const date = compactDate(event.date);
  const start = compactTime(event.start_time);
  const end = compactTime(event.end_time);
  if (date && start && end) {
    params.set("dates", `${date}T${start}/${date}T${end}`);
    params.set("ctz", "Asia/Jakarta");
  }
  const location = [event.venue_name, event.address].filter(Boolean).join(", ");
  if (location) params.set("location", location);
  return `https://www.google.com/calendar/render?${params.toString()}`;
}
