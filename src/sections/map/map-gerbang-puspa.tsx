"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SectionRenderProps } from "../types";
import {
  canPairLocation,
  externalLink,
  textValue,
} from "../gerbang-puspa/phase-two-data";
import { adjacentGerbangSection } from "../gerbang-puspa/phase-three-data";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./map-gerbang-puspa.module.css";

export function MapGerbangPuspa({ props }: SectionRenderProps) {
  const venue = textValue(props.venue_name),
    address = textValue(props.address);
  const maps = externalLink(textValue(props.maps_url)),
    embed = externalLink(textValue(props.embed_url));
  const ref = useRef<HTMLElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [failedEmbed, setFailedEmbed] = useState<string>();

  useEffect(() => {
    const location = ref.current;
    if (!location) return;
    const measure = () => {
      const events = adjacentGerbangSection(
        location,
        "previous",
      )?.querySelector<HTMLElement>("[data-gerbang-puspa-events]");
      const card = events?.querySelector<HTMLElement>("[data-gp-event-card]");
      const related =
        card &&
        canPairLocation({
          groups: events?.dataset.gpEventGroups,
          venue,
          address,
          maps,
          embed,
          eventVenue: card.dataset.gpEventVenue ?? "",
          eventAddress: card.dataset.gpEventAddress ?? "",
          eventMaps: card.dataset.gpEventMaps,
        });
      setSlot(
        related
          ? card.querySelector<HTMLElement>("[data-gp-event-map-slot]")
          : null,
      );
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(
      location.closest("[data-gerbang-puspa]") ?? location.parentElement!,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-gp-event-groups",
          "data-gp-event-venue",
          "data-gp-event-address",
          "data-gp-event-maps",
        ],
      },
    );
    return () => observer.disconnect();
  }, [venue, address, maps, embed]);

  const content = (
    <div
      className={styles.locationCard}
      data-gp-location-action={!!slot || undefined}
    >
      {!slot && (
        <div className={styles.addressBlock}>
          <h2>Lokasi</h2>
          {venue && <strong>{venue}</strong>}
          {address && <p>{address}</p>}
        </div>
      )}
      {!slot && embed && failedEmbed !== embed && (
        <iframe
          src={embed}
          title={venue ? `Peta ${venue}` : "Peta lokasi"}
          loading="lazy"
          className={styles.map}
          onError={() => setFailedEmbed(embed)}
        />
      )}
      {!slot && !maps && (!embed || failedEmbed === embed) && (
        <p className={styles.fallback}>Lokasi belum tersedia.</p>
      )}
      {maps && (
        <a
          className={styles.mapButton}
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka Lokasi
        </a>
      )}
    </div>
  );
  return (
    <section
      ref={ref}
      className={`${foundation.scene} ${styles.location} ${slot ? styles.joined : ""}`}
      data-scene="location"
      data-gerbang-puspa-location
      data-gp-location-joined={!!slot}
    >
      {slot ? createPortal(content, slot) : content}
    </section>
  );
}
