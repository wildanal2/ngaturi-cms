"use client";

import { useState, type CSSProperties } from "react";
import type { SectionRenderProps } from "../types";
import { textProp } from "../serambi-delima/primitives";
import {
  GalleryMedia,
  type GalleryImageData,
} from "../serambi-delima/gallery-media";
import { SerambiLightbox } from "../serambi-delima/lightbox";
import {
  SerambiEntrance,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import surfaces from "../serambi-delima/sections.module.css";
import styles from "../serambi-delima/phase-three.module.css";

export function GallerySerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const images: GalleryImageData[] = Array.isArray(props.images)
    ? props.images.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        return [{ url: textProp(item.url), caption: textProp(item.caption) }];
      })
    : [];
  const columns =
    typeof props.columns === "number" && Number.isFinite(props.columns)
      ? Math.min(4, Math.max(1, Math.round(props.columns)))
      : 3;
  const [active, setActive] = useState<{
    index: number;
    opener: HTMLButtonElement;
  } | null>(null);
  return (
    <SerambiSection type="gallery" title="Galeri Foto" inCanvas={inCanvas}>
      <SerambiEntrance inCanvas={inCanvas}>
        {images.length ? (
          <ul
            className={styles.galleryGrid}
            data-columns={columns}
            style={{ "--sd-gallery-columns": columns } as CSSProperties}
          >
            {images.map((image, index) => (
              <li key={index} className={styles.galleryItem}>
                <button
                  type="button"
                  className={styles.galleryTile}
                  aria-haspopup="dialog"
                  aria-label={
                    image.caption
                      ? `Buka foto ${index + 1}: ${image.caption}`
                      : `Buka foto ${index + 1}`
                  }
                  onClick={(event) => {
                    setActive({ index, opener: event.currentTarget });
                  }}
                >
                  <GalleryMedia key={image.url} image={image} index={index} />
                </button>
                {image.caption ? (
                  <p dir="auto" className={styles.galleryCaption}>
                    {image.caption}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={surfaces.copy}>Belum ada foto untuk ditampilkan.</p>
        )}
      </SerambiEntrance>
      {active !== null && images.length > 0 ? (
        <SerambiLightbox
          images={images}
          initialIndex={active.index}
          restoreFocusTo={active.opener}
          onClose={() => setActive(null)}
        />
      ) : null}
    </SerambiSection>
  );
}
