import { CalendarDays, CalendarPlus, MapPin } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { formatEventDate, formatTimeRange } from "../shared";
import { eventCalendarUrl, normalizeEventDetails } from "./event-data";
import styles from "../enchanted-garden/enchanted-garden.module.css";

/** Compact teak-and-gold ceremony cards for the journey viewport. */
export function EventEnchantedGarden({ props }: SectionRenderProps) {
  const p = props as { intro?: string; events?: unknown };
  const events = normalizeEventDetails(p.events);
  return (
    <section className="px-5 py-8 text-center">
      <p className="text-xs tracking-[0.3em] text-[var(--inv-secondary)] uppercase">
        Rangkaian Acara
      </p>
      {p.intro ? (
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--inv-ink)]">
          {p.intro}
        </p>
      ) : null}
      <div className={styles.royalEventGrid}>
        {events.map((event, index) => (
          <article
            key={`${event.name ?? "acara"}-${index}`}
            className={`${styles.royalEventCard} rounded-2xl border border-[color-mix(in_srgb,var(--inv-secondary)_35%,transparent)] bg-[color-mix(in_srgb,var(--inv-bg)_75%,transparent)] p-4`}
          >
            <CalendarDays
              className="mx-auto text-[var(--inv-secondary)]"
              size={20}
            />
            <h3 className="mt-2 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
              {event.name ?? "Acara"}
            </h3>
            <p className="mt-2 text-sm text-[var(--inv-ink)]">
              {formatEventDate(event.date)}
            </p>
            <p className="text-sm text-[var(--inv-ink)]">
              {formatTimeRange(event.start_time, event.end_time)}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--inv-primary)]">
              {event.venue_name}
            </p>
            {event.address ? (
              <p className="mt-1 text-xs leading-relaxed text-[var(--inv-ink)]">
                {event.address}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <a
                href={eventCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--inv-secondary)] px-3 py-1 text-xs text-[var(--inv-primary)]"
              >
                <CalendarPlus size={12} /> Kalender
              </a>
              {event.maps_url ? (
                <a
                  href={event.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--inv-secondary)] px-3 py-1 text-xs text-[var(--inv-primary)]"
                >
                  <MapPin size={12} /> Lihat lokasi
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
