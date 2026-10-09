"use client";

import { CalendarPlus, Navigation } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { formatTimeRange } from "../shared";
import { textProp } from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiLink,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import { eventCalendarUrl, normalizeEventDetails } from "./event-data";
import styles from "../serambi-delima/sections.module.css";

function EventDate({ iso }: { iso: string }) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <p className={styles.copy}>{iso}</p>;
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("id-ID", {
      ...options,
      timeZone: "Asia/Jakarta",
    }).format(date);
  return (
    <time className={styles.dateBlock} dateTime={iso}>
      <span>{format({ weekday: "long" })}</span>
      <span className={styles.dayNumber}>{format({ day: "2-digit" })}</span>
      <span>{format({ month: "long", year: "numeric" })}</span>
    </time>
  );
}

export function EventSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const events = normalizeEventDetails(props.events);
  return (
    <SerambiSection
      type="event-details"
      title="Rangkaian Acara"
      intro={textProp(props.intro)}
      inCanvas={inCanvas}
    >
      <div className={styles.stack}>
        {events.map((event, index) => (
          <SerambiEntrance key={index} inCanvas={inCanvas}>
            <article className={styles.panel}>
              <span className={styles.panelJewel} aria-hidden="true" />
              <h3 className={styles.panelTitle}>{event.name}</h3>
              <EventDate iso={event.date} />
              {event.start_time ? (
                <p className={styles.eventTime}>
                  {formatTimeRange(event.start_time, event.end_time)}
                </p>
              ) : null}
              <p className={styles.venue}>{event.venue_name}</p>
              {event.address ? (
                <p className={styles.address}>{event.address}</p>
              ) : null}
              <div className={styles.actions}>
                <SerambiLink href={eventCalendarUrl(event)} secondary>
                  <CalendarPlus size={18} aria-hidden="true" /> Kalender
                </SerambiLink>
                {event.maps_url ? (
                  <SerambiLink href={event.maps_url}>
                    <Navigation size={18} aria-hidden="true" /> Lihat Lokasi
                  </SerambiLink>
                ) : null}
              </div>
            </article>
          </SerambiEntrance>
        ))}
      </div>
    </SerambiSection>
  );
}
