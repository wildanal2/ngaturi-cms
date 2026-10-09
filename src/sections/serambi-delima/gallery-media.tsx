"use client";

import { useState } from "react";
import { DelimaSeal } from "./primitives";
import styles from "./phase-three.module.css";

export type GalleryImageData = { url: string; caption?: string };

/** Shared by the responsive thumbnail and uncropped viewer. Key by URL to retry edits. */
export function GalleryMedia({
  image,
  index,
  eager = false,
}: {
  image: GalleryImageData;
  index: number;
  eager?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    image.url ? "loading" : "failed",
  );
  const alt = image.caption || `Foto ${index + 1}`;
  return (
    <div className={styles.media} aria-busy={status === "loading"}>
      {status !== "loaded" ? (
        <div className={styles.mediaFallback}>
          <DelimaSeal className={styles.mediaSeal} />
          <span>
            {status === "failed" ? "Foto tidak tersedia" : "Memuat foto…"}
          </span>
        </div>
      ) : null}
      {image.url && status !== "failed" ? (
        // Invitation URLs follow the existing media contract, without a new host allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(node) => {
            if (node?.complete) {
              const next = node.naturalWidth > 0 ? "loaded" : "failed";
              if (status !== next) setStatus(next);
            }
          }}
          src={image.url}
          alt={alt}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={styles.galleryImage}
          data-loaded={status === "loaded"}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("failed")}
        />
      ) : null}
    </div>
  );
}
