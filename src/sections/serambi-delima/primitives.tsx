"use client";

import { useState, type ReactNode } from "react";
import { serambiFonts } from "./fonts";
import styles from "./serambi-delima.module.css";

export const serambiTheme = `${serambiFonts} ${styles.theme}`;
export const serambiAsset = (file: string) => `/themes/serambi-delima/${file}`;
export const textProp = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

/** Decoration is never part of the reading order or the pointer target. */
function Artwork({ file, className }: { file: string; className?: string }) {
  return (
    // Original local SVGs; preserve their vector resolution without image transforms.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={serambiAsset(file)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  );
}

export function Divider() {
  return <Artwork file="divider.svg" className={styles.divider} />;
}

export function BotanicalBorder() {
  return (
    <div className={styles.botanicalBorder} aria-hidden="true">
      <span className={styles.branchLeft}>
        <Artwork file="botanical-spray.svg" />
      </span>
      <span className={styles.branchRight}>
        <Artwork file="botanical-spray.svg" />
      </span>
      <span className={styles.borderJewel} />
    </div>
  );
}

export function Portal({ children }: { children: ReactNode }) {
  return (
    <div className={styles.portal}>
      <div className={styles.portalColumns} aria-hidden="true" />
      <Artwork file="portal-crown.svg" className={styles.portalCrown} />
      {children}
    </div>
  );
}

/** Original pomegranate seal, also the no-media visual; no stock photo dependency. */
export function DelimaSeal({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M50 5C36 21 11 20 11 49v35c0 19 22 25 39 31 17-6 39-12 39-31V49C89 20 64 21 50 5Z"
        stroke="currentColor"
      />
      <path
        d="M50 14C37 27 18 27 18 50v32c0 16 17 23 32 28 15-5 32-12 32-28V50c0-23-19-23-32-36Z"
        stroke="currentColor"
        opacity=".45"
      />
      <path
        d="m42 48-3-10 11 5 11-5-3 10M50 49C21 41 21 80 50 86c29-6 29-45 0-37Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M41 56c-7 5-7 15-1 19M50 35c1-11 9-14 16-12-2 9-8 12-16 12Z"
        stroke="currentColor"
      />
      <circle cx="50" cy="96" r="2" fill="currentColor" />
    </svg>
  );
}

function Media({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <div className={styles.mediaFallback} aria-hidden="true">
        <DelimaSeal className={styles.fallbackSeal} />
      </div>
      {src && !failed ? (
        // User-supplied URLs follow the existing cover contract, including non-optimizer hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(node) => {
            if (node?.complete && node.naturalWidth === 0) setFailed(true);
          }}
          data-serambi-photo
          src={src}
          alt={alt}
          width={900}
          height={1200}
          className={styles.photo}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : null}
    </>
  );
}

export function PortraitMedia({
  src,
  alt = "",
}: {
  src: string;
  alt?: string;
}) {
  // Changing media in Builder retries a new URL without persisting UI state.
  return <Media key={src} src={src} alt={alt} />;
}
