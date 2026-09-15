import type { SectionRenderProps } from "../types";
import { MapsLink, SceneBody } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Alamat dan CTA DOM normal pada scene arsitektur. */
export function MapCinematicVintage({ props }: SectionRenderProps) {
  const p = props as {
    venue_name?: string;
    address?: string;
    maps_url?: string;
  };
  return (
    <SceneBody className={styles.venueScene}>
      <p className={styles.eyebrow}>Tempat kita bertemu</p>
      <div aria-hidden="true" className={styles.venueArch} />
      <h2>{p.venue_name ?? "Lokasi acara"}</h2>
      <p className="mx-auto mt-4 max-w-xs">{p.address}</p>
      <MapsLink href={p.maps_url} />
    </SceneBody>
  );
}
