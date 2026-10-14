"use client";

import Image from "next/image";
import { useState } from "react";
import type { z } from "zod";
import type { GalleryProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { HeritageFrame } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

function Memory({
  photo,
  index,
}: {
  photo: { url: string; caption?: string };
  index: number;
}) {
  const [landscape, setLandscape] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <figure data-world-panel className={styles.galleryPanel}>
      <HeritageFrame
        className={`${styles.galleryFrame} ${landscape ? styles.landscapeFrame : ""}`}
      >
        <div
          className={`${styles.memoryImage} ${landscape ? styles.landscapeImage : ""}`}
        >
          {failed ? (
            <span className={styles.memoryFallback}>Kenangan kami</span>
          ) : (
            <Image
              src={photo.url}
              alt={photo.caption ?? `Kenangan ${index + 1}`}
              fill
              sizes="(max-width: 512px) 76vw, 370px"
              className={styles.memoryPhoto}
              onLoad={(event) =>
                setLandscape(
                  event.currentTarget.naturalWidth >
                    event.currentTarget.naturalHeight,
                )
              }
              onError={() => setFailed(true)}
            />
          )}
        </div>
        <figcaption className={styles.galleryCaption}>
          <span className={styles.eyebrow}>
            Kenangan · {String(index + 1).padStart(2, "0")}
          </span>
          {photo.caption ? <p>{photo.caption}</p> : null}
        </figcaption>
      </HeritageFrame>
    </figure>
  );
}

/** Related frames preserve photographic orientation without persisted media fields. */
export function GalleryCinematicVintage({ props }: SectionRenderProps) {
  const p = props as Partial<z.infer<typeof GalleryProps>>;
  return (
    <div className={styles.gallery} data-gallery-frames>
      {(p.images ?? [])
        .filter((photo) => photo.url?.trim())
        .map((photo, index) => (
          <Memory key={`${index}:${photo.url}`} photo={photo} index={index} />
        ))}
    </div>
  );
}
