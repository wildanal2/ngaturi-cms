"use client";

import type { SectionRenderProps } from "../types";
import {
  BotanicalBorder,
  Divider,
  Portal,
  PortraitMedia,
  serambiTheme,
  textProp,
} from "../serambi-delima/primitives";
import { useSerambiEntrance } from "../serambi-delima/use-entrance";
import styles from "../serambi-delima/serambi-delima.module.css";

function eventDate(value: string) {
  if (!value) return "";
  // Date fields represent a calendar day: SSR and the guest's timezone must agree.
  const date = new Date(value.slice(0, 10) + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function HeroSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const ref = useSerambiEntrance(inCanvas, true);
  const names = textProp(props.couple_names, "Nama Mempelai");
  const date = eventDate(textProp(props.event_date));

  return (
    <section className={`${serambiTheme} ${styles.hero}`} data-serambi-delima>
      <div ref={ref} data-motion={inCanvas ? "preview" : "pending"}>
        <div className={styles.heroTop}>
          <Divider />
        </div>
        <div className={`${styles.portraitFrame} ${styles.enterZoom}`}>
          <Portal>
            <div className={styles.portraitMask}>
              <PortraitMedia
                src={
                  textProp(props.background_image) ||
                  textProp(props.couple_image)
                }
                alt={names ? `Potret ${names}` : "Potret pasangan"}
              />
            </div>
          </Portal>
        </div>
        <div className={`${styles.heroCopy} ${styles.enterUp}`}>
          {textProp(props.tagline) ? (
            <p className={styles.eyebrow}>{textProp(props.tagline)}</p>
          ) : null}
          <h1
            className={styles.heroNames}
            tabIndex={-1}
            data-serambi-hero-focus
            onBlur={(event) => {
              delete event.currentTarget.dataset.focusOrigin;
            }}
          >
            {names}
          </h1>
          <Divider />
          {date ? (
            <time
              className={styles.eventDate}
              dateTime={textProp(props.event_date).slice(0, 10)}
            >
              {date}
            </time>
          ) : null}
        </div>
        <BotanicalBorder />
      </div>
    </section>
  );
}
