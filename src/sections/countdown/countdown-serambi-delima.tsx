"use client";

import { CalendarPlus } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { textProp } from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiLink,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import { Expired, UNITS, useCountdown } from "./use-countdown";
import styles from "../serambi-delima/sections.module.css";

export function CountdownSerambiDelima({
  props,
  inCanvas,
}: SectionRenderProps) {
  const countdown = useCountdown(textProp(props.target_date));
  const calendarUrl = textProp(props.calendar_url);
  const target = textProp(props.target_date);
  const date = target ? new Date(target) : null;
  const finalDate =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }).format(date)
      : "";
  return (
    <SerambiSection
      type="countdown"
      title="Menuju Hari Bahagia"
      inCanvas={inCanvas}
    >
      <SerambiEntrance inCanvas={inCanvas}>
        <div className={styles.countdownStage}>
          {countdown?.done ? (
            <div className={styles.completed} role="status">
              <Expired msg={textProp(props.message_expired) || undefined} />
            </div>
          ) : (
            <dl
              className={styles.countdownGrid}
              aria-label="Hitung mundur menuju acara"
              aria-live="off"
              aria-busy={!countdown}
            >
              {UNITS.map(([label, key]) => (
                <div key={key} className={styles.countdownUnit}>
                  <dt>{label}</dt>
                  <dd className={styles.countdownValue}>
                    {countdown ? String(countdown[key]).padStart(2, "0") : "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {finalDate ? (
            <time className={styles.countdownDate} dateTime={target}>
              {finalDate}
            </time>
          ) : null}
          {calendarUrl ? (
            <div className={styles.actions}>
              <SerambiLink href={calendarUrl} secondary>
                <CalendarPlus size={18} aria-hidden="true" /> Tambah ke Kalender
              </SerambiLink>
            </div>
          ) : null}
        </div>
      </SerambiEntrance>
    </SerambiSection>
  );
}
