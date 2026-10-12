"use client";

import type { SectionRenderProps } from "../types";
import { eventCalendarUrl } from "./event-data";
import {
  ceremonyDate,
  ceremonyEvents,
  ceremonyGroups,
  ceremonyTime,
  externalLink,
  textValue,
} from "../gerbang-puspa/phase-two-data";
import { GerbangPuspaPhaseTwoReveal as Reveal } from "../gerbang-puspa/phase-two-media";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./event-gerbang-puspa.module.css";

export function EventGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const groups = ceremonyGroups(ceremonyEvents(props.events));
  return (
    <section
      className={`${foundation.scene} ${styles.events}`}
      data-scene="events"
      data-gerbang-puspa-events
      data-gp-event-groups={groups.length}
    >
      <Reveal kind="down" delay={500} inCanvas={inCanvas}>
        <h2>Save The Date</h2>
      </Reveal>
      {textValue(props.intro) && (
        <p className={styles.intro}>{textValue(props.intro)}</p>
      )}
      {groups.map((events, index) => {
        const event = events[0],
          date = ceremonyDate(event.date),
          maps = externalLink(event.maps_url);
        return (
          <Reveal
            kind="zoom"
            inCanvas={inCanvas}
            key={index}
            className={styles.eventCard}
          >
            <article
              data-gp-event-card
              data-gp-event-venue={event.venue_name}
              data-gp-event-address={event.address ?? ""}
              data-gp-event-maps={maps ?? ""}
            >
              <span className={styles.rings} aria-hidden="true">
                <svg
                  width="38"
                  height="38"
                  viewBox="0 0 50 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                >
                  <circle cx="19" cy="30" r="12" />
                  <circle cx="32" cy="30" r="12" />
                  <circle cx="19" cy="30" r="9" />
                  <circle cx="32" cy="30" r="9" />
                  <path d="m14 11 5-5 5 5-5 7zM14 11h10M19 6v12" />
                </svg>
              </span>
              <Reveal kind="down" delay={1500} inCanvas={inCanvas}>
                <h3>{events.map((item) => item.name).join(" & ")}</h3>
              </Reveal>
              {date ? (
                <div className={styles.dateRow}>
                  <span>{date.weekday}</span>
                  <strong>{date.day}</strong>
                  <span>
                    {date.month}
                    <br />
                    {date.year}
                  </span>
                </div>
              ) : (
                <p className={styles.dateText}>{event.date}</p>
              )}
              {events.map((item, eventIndex) => (
                <p className={styles.timeLine} key={eventIndex}>
                  {item.name}
                  {ceremonyTime(item.start_time, item.end_time) &&
                    `: ${ceremonyTime(item.start_time, item.end_time)}`}
                  <a
                    className={styles.calendar}
                    href={eventCalendarUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Simpan ${item.name} ke kalender`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M7 3v4m10-4v4M3 10h18m-6 6h4m-2-2v4" />
                    </svg>
                  </a>
                </p>
              ))}
              <strong className={styles.venue}>{event.venue_name}</strong>
              {event.address && (
                <p className={styles.address}>{event.address}</p>
              )}
              <div className={styles.mapSlot}>
                {maps && (
                  <a
                    className={styles.mapButton}
                    data-gp-event-map
                    href={maps}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Maps
                  </a>
                )}
              </div>
            </article>
          </Reveal>
        );
      })}
      {!groups.length && <p>Acara belum diisi.</p>}
    </section>
  );
}
