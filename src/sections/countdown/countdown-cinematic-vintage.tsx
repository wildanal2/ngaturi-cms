"use client";

import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import { HeritageFrame, SceneBody } from "../cinematic/primitives";
import { useCountdown, UNITS } from "./use-countdown";
import styles from "../cinematic/cinematic.module.css";

export function CountdownCinematicVintage({ props }: SectionRenderProps) {
  const p = props as {
    target_date?: string;
    message_expired?: string;
    calendar_url?: string;
  };
  const timer = useCountdown(p.target_date);
  if (!p.target_date?.trim() || !Number.isFinite(Date.parse(p.target_date)))
    return null;
  const calendar =
    p.calendar_url && /^https?:\/\//i.test(p.calendar_url)
      ? p.calendar_url
      : undefined;
  return (
    <SceneBody className={styles.countdownScene}>
      <HeritageFrame className={styles.countdownFrame}>
        <p className={styles.eyebrow}>Menuju hari bahagia</p>
        <h2>Janji yang dinantikan</h2>
        <p className={styles.countdownDate}>{formatEventDate(p.target_date)}</p>
        <div className={styles.rule} />
        <div
          className={styles.countdownClock}
          aria-label="Hitung mundur menuju pernikahan"
        >
          {timer?.done ? (
            <p className={styles.expired}>
              {p.message_expired ?? "Acara telah berlangsung"}
            </p>
          ) : (
            <div className={styles.countdownUnits}>
              {UNITS.map(([label, key]) => (
                <div
                  key={key}
                  className={key === "s" ? styles.seconds : undefined}
                >
                  <span className={styles.countdownNumber}>
                    {timer ? String(timer[key]).padStart(2, "0") : "—"}
                  </span>
                  <span className={styles.countdownUnit}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {calendar ? (
          <a
            className={styles.button}
            href={calendar}
            target="_blank"
            rel="noopener noreferrer"
          >
            Tambah ke Kalender <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </HeritageFrame>
    </SceneBody>
  );
}
