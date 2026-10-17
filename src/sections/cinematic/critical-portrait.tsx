"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./cinematic.module.css";

/** The first photograph can fail without exposing a broken-image icon. */
export function CriticalPortrait({
  src,
  alt,
  eager = true,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      role="img"
      aria-label={alt ? `Foto ${alt} belum tersedia` : "Foto belum tersedia"}
      className={styles.monogram}
    >
      ♡
    </span>
  ) : (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 88vw, 610px"
      loading={eager ? "eager" : "lazy"}
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}
