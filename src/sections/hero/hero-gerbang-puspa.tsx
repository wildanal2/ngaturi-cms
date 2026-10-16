"use client";

import type { SectionRenderProps } from "../types";
import {
  GerbangPuspaMonogram,
  GerbangPuspaOrnaments,
} from "../gerbang-puspa/primitives";
import { useGerbangPuspa } from "../gerbang-puspa/opening";
import { GP_ASSETS } from "../gerbang-puspa/assets";
import { GerbangPuspaMedia } from "../gerbang-puspa/phase-two-media";
import { splitGerbangPuspaNames } from "../gerbang-puspa/content";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./hero-gerbang-puspa.module.css";
import { GerbangPuspaGate } from "../gerbang-puspa/gate";

function splitNames(value: string): string[] {
  return splitGerbangPuspaNames(value);
}

function invitationDate(value: string): string {
  const calendar = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!calendar) return value;
  const [, year, month, day] = calendar;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`
  ) {
    return value;
  }
  return `${day} . ${month} . ${year}`;
}

/** Normal-flow identity over the original garden artwork. */
export function HeroGerbangPuspa({
  props,
  inCanvas = false,
}: SectionRenderProps) {
  const opening = useGerbangPuspa();
  const names = splitNames(String(props.couple_names ?? ""));
  const started = opening?.heroReady ?? true;
  const media = String(props.background_image ?? "").trim();
  const bismillah = String(props.bismillah ?? "").trim();

  return (
    <section
      className={`${foundation.scene} ${styles.hero}`}
      data-scene="hero"
      data-gerbang-puspa-hero
      data-gp-hero-focus
      data-hero-started={started}
      data-in-canvas={inCanvas}
      data-desktop={opening?.desktopComposition ?? false}
      aria-label={String(props.tagline ?? "") || undefined}
      tabIndex={-1}
    >
      <div className={styles.gardenFilm} aria-hidden="true">
        {/* The local gate is an original substitute, never vendor film. */}
        <GerbangPuspaMedia src={media} fallback={GP_ASSETS.gate} alt="" eager />
      </div>
      <GerbangPuspaGate />
      <div className={styles.heroFrame}>
        <GerbangPuspaMonogram
          names={String(props.couple_names ?? "")}
          className={styles.initials}
        />
        {bismillah && <p className={styles.bismillah}>{bismillah}</p>}
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{String(props.tagline ?? "")}</p>
          <h1
            className={`${styles.names} ${names.some((name) => Array.from(name).length > 22) ? styles.longNames : ""}`}
          >
            <span>{names[0]}</span>
            {names.length === 2 && (
              <>
                <span className={styles.ampersand}>&amp;</span>
                <span>{names[1]}</span>
              </>
            )}
          </h1>
          <p className={styles.date}>
            {invitationDate(String(props.event_date ?? ""))}
          </p>
          <span className={styles.scrollCue} aria-hidden="true">
            <svg width="30" height="32" viewBox="0 0 30 32">
              <path
                d="M5 7 15 17 25 7 M5 17 15 27 25 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
      <GerbangPuspaOrnaments hero />
    </section>
  );
}
