"use client";

import { useId, type ReactNode } from "react";
import { BotanicalBorder, Divider, serambiTheme } from "./primitives";
import { useSerambiEntrance } from "./use-entrance";
import foundation from "./serambi-delima.module.css";
import styles from "./sections.module.css";

/** Each content block uses the existing entrance lifecycle and scroll owner. */
export function SerambiEntrance({
  children,
  inCanvas,
  zoom = false,
  className,
}: {
  children: ReactNode;
  inCanvas?: boolean;
  zoom?: boolean;
  className?: string;
}) {
  const ref = useSerambiEntrance(inCanvas, true);
  return (
    <div
      ref={ref}
      className={className}
      data-motion={inCanvas ? "preview" : "pending"}
    >
      <div className={zoom ? foundation.enterZoom : foundation.enterUp}>
        {children}
      </div>
    </div>
  );
}

export function SerambiSection({
  type,
  title,
  eyebrow,
  intro,
  children,
  inCanvas,
}: {
  type: string;
  title: string;
  eyebrow?: string;
  intro?: string;
  children: ReactNode;
  inCanvas?: boolean;
}) {
  const titleId = useId();
  return (
    <section
      data-section={type}
      data-serambi-delima
      aria-labelledby={titleId}
      className={`${serambiTheme} ${styles.section}`}
    >
      <div className={styles.content}>
        <SerambiEntrance inCanvas={inCanvas} className={styles.sectionHeader}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Divider />
          {intro ? <p className={styles.copy}>{intro}</p> : null}
        </SerambiEntrance>
        {children}
      </div>
      {/* Dedicated space keeps foliage outside all editable text and actions. */}
      <SerambiEntrance inCanvas={inCanvas} className={styles.footer}>
        <BotanicalBorder />
      </SerambiEntrance>
    </section>
  );
}

export function SerambiLink({
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
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${foundation.button} ${styles.action} ${secondary ? styles.secondaryAction : ""}`}
    >
      {children}
    </a>
  );
}
