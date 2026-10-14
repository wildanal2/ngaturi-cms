"use client";

import { MapPin, Navigation } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { textProp } from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiLink,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import styles from "../serambi-delima/sections.module.css";

export function MapSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const venue = textProp(props.venue_name);
  const address = textProp(props.address);
  const embedUrl = textProp(props.embed_url);
  const mapsUrl = textProp(props.maps_url);
  return (
    <SerambiSection
      type="map-location"
      title="Lokasi Acara"
      inCanvas={inCanvas}
    >
      <SerambiEntrance inCanvas={inCanvas}>
        <div className={styles.panel}>
          <span className={styles.panelJewel} aria-hidden="true" />
          {venue ? <h3 className={styles.panelTitle}>{venue}</h3> : null}
          {address ? <p className={styles.address}>{address}</p> : null}
          <div className={styles.mapFrame}>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={venue ? `Peta lokasi ${venue}` : "Peta lokasi acara"}
                loading="lazy"
                allowFullScreen
                className={styles.mapEmbed}
              />
            ) : (
              <div className={styles.mapFallback}>
                <MapPin size={32} aria-hidden="true" />
                <p className={styles.copy}>Peta belum tersedia</p>
              </div>
            )}
          </div>
          {mapsUrl ? (
            <div className={styles.actions}>
              <SerambiLink href={mapsUrl}>
                <Navigation size={18} aria-hidden="true" /> Buka di Google Maps
              </SerambiLink>
            </div>
          ) : null}
        </div>
      </SerambiEntrance>
    </SerambiSection>
  );
}
