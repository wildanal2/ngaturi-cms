"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SectionRenderProps } from "../types";
import { TurnstileField } from "../turnstile-field";
import { useRsvp } from "./use-rsvp";
import { resizeCinematicTextarea } from "../cinematic/textarea";
import { animateCinematicScroll } from "../cinematic/scroll";
import styles from "../cinematic/cinematic.module.css";

const ATTENDANCE = [
  ["attending", "Hadir"],
  ["not_attending", "Tidak hadir"],
  ["maybe", "Masih ragu"],
] as const;

export function RsvpCinematicVintage({
  props,
  invitationId,
  guestName,
  isPreview,
  inCanvas,
}: SectionRenderProps) {
  const p = props as {
    max_guests_per_person?: number;
    require_phone?: boolean;
  };
  const id = useId();
  const { state, error, summary, onSubmit } = useRsvp(invitationId, isPreview);
  const confirmation = useRef<HTMLDivElement>(null);
  const [confirmationHeight, setConfirmationHeight] = useState(0);
  useEffect(() => {
    if (state !== "done" || !confirmation.current) return;
    const node = confirmation.current;
    node.focus({ preventScroll: true });
    const heading = node.querySelector("h3");
    const scroller = node.closest<HTMLElement>("[data-device-scroller]");
    if (!heading || (inCanvas && !scroller)) return;
    const top = scroller?.getBoundingClientRect().top ?? 0;
    const height = scroller?.clientHeight ?? window.innerHeight;
    const box = heading.getBoundingClientRect();
    if (box.top < top + 24 || box.bottom > top + height - 24)
      animateCinematicScroll(
        scroller ?? window,
        (scroller?.scrollTop ?? window.scrollY) + box.top - top - height / 2,
      );
  }, [state, inCanvas]);
  return (
    <div className={`${styles.interactionChapter} ${styles.rsvpChapter}`}>
      <header className={styles.chapterHeading}>
        <p className={styles.eyebrow}>Sebuah tempat untuk Anda</p>
        <h2>Konfirmasi Kehadiran</h2>
        <p>Kehadiran Anda menjadi bagian dari kebahagiaan kami.</p>
      </header>
      <div className={`${styles.parchment} ${styles.invitationPaper}`}>
        {state === "done" ? (
          <div
            ref={confirmation}
            className={styles.confirmation}
            role="status"
            tabIndex={-1}
            style={{ minHeight: confirmationHeight || undefined }}
          >
            <span className={styles.confirmationMark} aria-hidden="true">
              ✓
            </span>
            <h3>Terima kasih</h3>
            <p>Konfirmasi Anda sudah kami terima.</p>
            <p className={styles.attendanceSummary}>
              {ATTENDANCE.find(([key]) => key === summary?.status)?.[1]}
              {summary?.status === "attending"
                ? ` · ${summary.count} tamu`
                : ""}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              setConfirmationHeight(event.currentTarget.offsetHeight);
              void onSubmit(event);
            }}
            className={styles.cinematicForm}
            aria-busy={state === "sending"}
          >
            <input
              type="text"
              name="_hp"
              tabIndex={-1}
              autoComplete="off"
              hidden
            />
            <label htmlFor={`${id}-name`}>
              Nama
              <input
                id={`${id}-name`}
                name="name"
                required
                autoComplete="name"
                defaultValue={guestName ?? ""}
              />
            </label>
            {p.require_phone ? (
              <label htmlFor={`${id}-phone`}>
                No. WhatsApp
                <input
                  id={`${id}-phone`}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  required
                />
              </label>
            ) : null}
            <fieldset className={styles.attendance}>
              <legend>Kehadiran</legend>
              <div>
                {ATTENDANCE.map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="status"
                      value={value}
                      required
                      defaultChecked={value === "attending"}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor={`${id}-count`}>
              Jumlah tamu
              <input
                id={`${id}-count`}
                name="guest_count"
                type="number"
                min={1}
                max={p.max_guests_per_person ?? 2}
                defaultValue={1}
                required
                inputMode="numeric"
              />
              <span className={styles.fieldHelp}>
                Termasuk Anda · maksimal {p.max_guests_per_person ?? 2} tamu
              </span>
            </label>
            <label htmlFor={`${id}-message`}>
              Ucapan <span className={styles.optional}>(opsional)</span>
              <textarea
                id={`${id}-message`}
                name="message"
                rows={3}
                onInput={(event) => resizeCinematicTextarea(event.currentTarget)}
              />
            </label>
            <TurnstileField />
            {error ? (
              <p className={styles.formError} role="alert">
                {error}
              </p>
            ) : null}
            <button
              className={styles.submitButton}
              type="submit"
              disabled={state === "sending"}
            >
              {state === "sending" ? "Mengirim…" : "Konfirmasi Kehadiran"}
            </button>
            {isPreview ? (
              <p className={styles.fieldHelp}>
                Pratinjau — konfirmasi tidak akan dikirim.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
