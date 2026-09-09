import type { z } from "zod";
import type { GalleryProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { HeritageFrame, Portrait } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Bingkai galeri modular, ditelusuri horizontal oleh kamera utama. */
export function GalleryCinematicVintage({ props }: SectionRenderProps) {
  const p = props as Partial<z.infer<typeof GalleryProps>>;
  return (
    <div className={styles.gallery} data-gallery-frames>
      {(p.images ?? []).map((photo, i) => (
        <figure key={i} data-world-panel className={styles.galleryPanel}>
          <HeritageFrame className={styles.galleryFrame}>
            <Portrait src={photo.url} alt={photo.caption ?? ""} />
            <figcaption className={styles.galleryCaption}>
              <span className={styles.eyebrow}>
                Kenangan · {String(i + 1).padStart(2, "0")}
              </span>
              {photo.caption ? <p>{photo.caption}</p> : null}
            </figcaption>
          </HeritageFrame>
        </figure>
      ))}
    </div>
  );
}
