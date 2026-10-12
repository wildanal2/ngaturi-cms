"use client";

import { useEffect, useRef, useState } from "react";
import { useCountdown, UNITS } from "./use-countdown";
import type { SectionRenderProps } from "../types";
import { GerbangPuspaOrnaments } from "../gerbang-puspa/primitives";
import { GerbangPuspaPhaseTwoReveal as Reveal } from "../gerbang-puspa/phase-two-media";
import { adjacentGerbangSection } from "../gerbang-puspa/phase-three-data";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./countdown-gerbang-puspa.module.css";

export function CountdownGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const target = typeof props.target_date === "string" ? props.target_date : "";
  const valid = !!target && Number.isFinite(Date.parse(target));
  const time = useCountdown(valid ? target : undefined);
  const ref = useRef<HTMLElement>(null);
  const [paired, setPaired] = useState(false);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () =>
      setPaired(
        !!adjacentGerbangSection(root, "next")?.querySelector(
          "[data-gerbang-puspa-rsvp]",
        ),
      );
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(
      root.closest("[data-gerbang-puspa]") ?? root.parentElement!,
      { childList: true, subtree: true },
    );
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      className={`${foundation.scene} ${styles.countdown}`}
      data-scene="countdown"
      data-gerbang-puspa-countdown
      data-countdown-state={
        !valid
          ? "unconfigured"
          : !time
            ? "pending"
            : time.done
              ? "completed"
              : "active"
      }
    >
      <div className={`${foundation.frame} ${styles.centeredFrame}`}>
        <Reveal kind="down" inCanvas={inCanvas}>
          <h2>Menghitung Hari</h2>
        </Reveal>
        <Reveal kind="zoom" inCanvas={inCanvas}>
          <div
            className={styles.timer}
            role="timer"
            aria-label="Hitung mundur acara"
          >
            {UNITS.map(([unit, key]) => (
              <div key={key}>
                <strong>{String(time?.[key] ?? 0).padStart(2, "0")}</strong>
                <span>{unit}</span>
              </div>
            ))}
          </div>
        </Reveal>
        {!valid && <p role="status">Tanggal acara belum diisi.</p>}
        {valid && time?.done && !!props.message_expired && (
          <p role="status">{String(props.message_expired)}</p>
        )}
        {paired && (
          <Reveal inCanvas={inCanvas}>
            <p>
              Kirim ucapan untuk mempelai
              <br />
              dan konfirmasi kehadiran
            </p>
            <button
              className={`${foundation.button} ${styles.button}`}
              type="button"
              disabled={inCanvas}
              title={
                inCanvas
                  ? "Formulir RSVP ditampilkan di bagian berikutnya dalam pratinjau."
                  : undefined
              }
              data-gp-countdown-rsvp
              onClick={() => {
                const target = adjacentGerbangSection(
                  ref.current!,
                  "next",
                )?.querySelector<HTMLElement>("[data-gerbang-puspa-rsvp]");
                if (!target) return;
                target
                  .querySelector<HTMLButtonElement>("[data-gp-rsvp-launch]")
                  ?.click();
              }}
            >
              Konfirmasi &amp; Kirim Ucapan
            </button>
          </Reveal>
        )}
        {!!props.calendar_url && (
          <a
            className={styles.calendar}
            href={String(props.calendar_url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Simpan ke kalender
          </a>
        )}
      </div>
      <GerbangPuspaOrnaments />
    </section>
  );
}
