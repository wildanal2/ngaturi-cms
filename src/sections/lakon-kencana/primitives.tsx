"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { LAKON_ASSETS, imageUrl } from "./data";
import { Entrance, useLakonParallax } from "./presentation";
import styles from "./lakon-kencana.module.css";

export function Flourish({ className = "" }: { className?: string }) {
  return (
    <img
      src={`${LAKON_ASSETS}/flourish.svg`}
      width={240}
      height={58}
      alt=""
      aria-hidden="true"
      className={`${styles.flourish} ${className}`}
    />
  );
}
export function Corners() {
  return (
    <div className={styles.corners} aria-hidden="true">
      <Flourish />
      <Flourish />
    </div>
  );
}
export function Gunungan({ className = "" }: { className?: string }) {
  return (
    <img
      src={`${LAKON_ASSETS}/gunungan.webp`}
      width={512}
      height={768}
      alt=""
      aria-hidden="true"
      className={`${styles.gunungan} ${className}`}
    />
  );
}
export function Puppet({
  female = false,
  className = "",
  parallax,
}: {
  female?: boolean;
  className?: string;
  parallax?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLakonParallax(ref, parallax);
  return (
    <span
      ref={ref}
      data-lakon-parallax={parallax}
      className={`${styles.puppet} ${female ? styles.female : ""} ${className}`}
      aria-hidden="true"
    >
      <img
        src={`${LAKON_ASSETS}/wayang-pair.webp`}
        alt=""
        width={1536}
        height={1024}
      />
    </span>
  );
}
export function Photo({
  src,
  alt = "",
  eager = false,
  className = "",
  position,
  reveal = false,
}: {
  src: unknown;
  alt?: string;
  eager?: boolean;
  className?: string;
  position?: string;
  reveal?: boolean;
}) {
  const url = imageUrl(src);
  const [failed, setFailed] = useState("");
  const attach = useCallback(
    (node: HTMLImageElement | null) => {
      // An SSR image can fail before hydration attaches React's error handler.
      if (node?.complete && node.naturalWidth === 0) setFailed(url);
    },
    [url],
  );
  return (
    <span
      className={`${styles.photo} ${className}`}
      data-lakon-photo
      data-lakon-reveal-item={reveal || undefined}
    >
      {url && failed !== url ? (
        <img
          key={url}
          ref={attach}
          src={url}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onError={() => setFailed(url)}
          style={position ? { objectPosition: position } : undefined}
        />
      ) : (
        <span
          className={styles.photoFallback}
          role={alt ? "img" : undefined}
          aria-label={alt ? `${alt} — foto belum tersedia` : undefined}
        >
          <Gunungan />
          <span>{alt ? "Foto belum tersedia" : ""}</span>
        </span>
      )}
    </span>
  );
}
export function Section({
  type,
  title,
  eyebrow,
  intro,
  dark = false,
  children,
  className = "",
}: {
  type: string;
  title?: string;
  eyebrow?: string;
  intro?: string;
  dark?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      data-lakon-scene={type}
      className={`${styles.section} ${dark ? styles.dark : ""} ${className}`}
      aria-labelledby={title ? id : undefined}
    >
      <Corners />
      <div className={styles.content}>
        {title && (
          <Entrance className={styles.heading}>
            <p className={styles.eyebrow}>{eyebrow || "PAHARGYAN PAWIWAHAN"}</p>
            <h2 id={id} tabIndex={-1}>
              {title}
            </h2>
            <Flourish />
            {intro && <p className={styles.intro}>{intro}</p>}
          </Entrance>
        )}
        {["rsvp", "guestbook", "gift", "countdown", "map-location"].includes(
          type,
        ) ? (
          <Entrance>{children}</Entrance>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
export function Action({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      className={`${styles.button} ${secondary ? styles.secondary : ""}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
