import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./cinematic.module.css";

export function DepthLayer({
  depth,
  className = "",
  children,
}: {
  depth: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-depth={depth}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function Backdrop() {
  return (
    <>
      <DepthLayer depth={0} className={styles.backdrop} />
      <DepthLayer depth={1} className={styles.architecture} />
      <DepthLayer depth={2} className={styles.chandelier} />
      <DepthLayer depth={3} className={styles.glow} />
      <DepthLayer depth={4} className={styles.floralLeft} />
      <DepthLayer depth={5} className={styles.floralRight} />
      <DepthLayer depth={6} className={styles.foregroundFloral} />
      <DepthLayer depth={2} className={styles.dust} />
    </>
  );
}

export function Portrait({
  src,
  alt = "",
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${styles.portrait} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 512px) 80vw, 410px"
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true" className={styles.monogram}>
          ♡
        </span>
      )}
    </div>
  );
}

export function HeritageFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.frame} ${className}`}>
      <span aria-hidden="true" className={styles.frameArt} />
      <div className={styles.frameBody}>{children}</div>
    </div>
  );
}

export function SceneBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.body} ${className}`}>{children}</div>;
}

export function MapsLink({ href }: { href?: string }) {
  if (!href || !/^https?:\/\//i.test(href)) return null;
  return (
    <a
      className={styles.button}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      Buka Google Maps <span aria-hidden="true">↗</span>
    </a>
  );
}
