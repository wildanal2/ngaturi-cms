"use client";

import { useState } from "react";
import type { SectionRenderProps } from "../types";
import { GerbangPuspaMedia } from "../gerbang-puspa/phase-two-media";
import { GP_PHASE_TWO_ASSETS as assets } from "../gerbang-puspa/phase-two-assets";
import { textValue } from "../gerbang-puspa/phase-two-data";
import { GerbangPuspaLightbox } from "../gerbang-puspa/phase-two-lightbox";
import styles from "./gallery-gerbang-puspa.module.css";

export function GalleryGerbangPuspa({ props }: SectionRenderProps) {
  const images = Array.isArray(props.images)
    ? props.images.map((item) => ({
        url: textValue(item?.url),
        caption: textValue(item?.caption),
      }))
    : [];
  const [active, setActive] = useState<{
    index: number;
    opener: HTMLButtonElement;
  } | null>(null);
  return (
    <section
      className={styles.gallery}
      data-scene="gallery"
      data-gerbang-puspa-gallery
      aria-label="Galeri foto"
    >
      {images.map((image, index) => (
        <button
          key={index}
          type="button"
          className={styles.photo}
          aria-label={
            image.caption
              ? `Buka foto ${index + 1}: ${image.caption}`
              : `Buka foto ${index + 1}`
          }
          onClick={(event) => setActive({ index, opener: event.currentTarget })}
        >
          <GerbangPuspaMedia
            src={image.url}
            fallback={assets.gallery[index % assets.gallery.length]}
            alt={image.caption || `Foto ${index + 1}`}
            style={{
              objectPosition:
                index === 0 ? "50% 65%" : index === 1 ? "50% 49%" : "50% 20%",
            }}
          />
        </button>
      ))}
      {!images.length && (
        <p className={styles.empty}>Foto belum ditambahkan.</p>
      )}
      {active && images.length > 0 && (
        <GerbangPuspaLightbox
          images={images}
          initialIndex={active.index}
          restoreFocusTo={active.opener}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}
