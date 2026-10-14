"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./cinematic.module.css";

/** The first photograph can fail without exposing a broken-image icon. */
export function CriticalPortrait({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span aria-hidden="true" className={styles.monogram}>
      ♡
    </span>
  ) : (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 512px) 80vw, 410px"
      loading="eager"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}
