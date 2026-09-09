import type { z } from "zod";
import type { EventDetailsProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { formatEventDate, formatTimeRange } from "../shared";
import { HeritageFrame, MapsLink } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Satu portal yang dipakai kembali untuk setiap acara editable. */
export function EventCinematicVintage({ props }: SectionRenderProps) {
  const p = props as Partial<z.infer<typeof EventDetailsProps>>;
  return (
    <div className={styles.events} data-event-portals>
      {(p.events ?? []).map((event, i) => (
        <article
          key={i}
          data-world-panel
          data-event-portal={i}
          className={styles.eventPanel}
        >
          <HeritageFrame
            className={`${styles.eventFrame} ${
              i % 2 === 0 ? styles.akadFrame : styles.receptionFrame
            }`}
          >
            <p className={styles.eyebrow}>Janji & perayaan</p>
            <h2>{event.name ?? "Acara"}</h2>
            <p className={styles.eventIntro}>{p.intro}</p>
            <p className="mt-5">{formatEventDate(event.date)}</p>
            <p>{formatTimeRange(event.start_time, event.end_time)}</p>
            <div className={styles.rule} />
            <h3>{event.venue_name}</h3>
            <p>{event.address}</p>
            <MapsLink href={event.maps_url} />
          </HeritageFrame>
        </article>
      ))}
    </div>
  );
}
