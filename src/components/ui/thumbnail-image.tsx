"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Preserve geometry with the neutral preview fallback when an image fails. */
export function ThumbnailImage(props: ImageProps) {
  return <ThumbnailAttempt key={String(props.src)} {...props} />;
}

function ThumbnailAttempt({ onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        role="img"
        aria-label="Pratinjau tidak tersedia"
        className={props.className}
        style={{
          ...props.style,
          ...(props.fill
            ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
            : {
                display: "flex",
                width: props.width,
                maxWidth: "100%",
                aspectRatio: `${props.width} / ${props.height}`,
              }),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Pratinjau tidak tersedia
      </span>
    );
  }
  return (
    <Image
      {...props}
      alt={props.alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
