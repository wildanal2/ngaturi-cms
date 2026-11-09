"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SectionRenderProps } from "../types";
import { TurnstileField } from "../turnstile-field";
import { useRsvp } from "./use-rsvp";
import { resizeCinematicTextarea } from "../cinematic/textarea";
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
  siblingTypes = [],
}: SectionRenderProps) {
  const p = props as {
    max_guests_per_person?: number;
    require_phone?: boolean;
  };
  const id = useId();
  const { state, error, summary, onSubmit } = useRsvp(invitationId, isPreview);
  const confirmation = useRef<HTMLDivElement>(null);
  const [confirmationHeight, setConfirmationHeight] = useState(0);
  const [attendance, setAttendance] = useState("");
  const [count, setCount] = useState(1);
  const maxGuests = Math.max(1, Math.min(20, p.max_guests_per_person ?? 2));
  useEffect(() => {
    if (state !== "done" || !confirmation.current) return;
    const node = confirmation.current;
    node.focus({ preventScroll: true });
  }, [state]);
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
            aria-describedby={error ? `${id}-error` : undefined}
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
                maxLength={120}
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
                  maxLength={40}
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
                      checked={attendance === value}
                      onChange={() => {
                        setAttendance(value);
                        if (value !== "not_attending")
                          setCount((previous) =>
                            Math.max(1, Math.min(maxGuests, previous)),
                          );
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {attendance && attendance !== "not_attending" ? (
              <label htmlFor={`${id}-count`}>
                Jumlah tamu
                <input
                  id={`${id}-count`}
                  name="guest_count"
                  type="number"
                  min={1}
                  max={maxGuests}
                  value={count}
                  onChange={(event) =>
                    setCount(event.currentTarget.valueAsNumber || 1)
                  }
                  required
                  inputMode="numeric"
                />
                <span className={styles.fieldHelp}>
                  Termasuk Anda · maksimal {maxGuests} tamu
                </span>
              </label>
            ) : (
              <input type="hidden" name="guest_count" value="1" />
            )}
            <label htmlFor={`${id}-message`}>
              Pesan pribadi untuk mempelai{" "}
              <span className={styles.optional}>(opsional)</span>
              <textarea
                id={`${id}-message`}
                name="message"
                rows={3}
                maxLength={1000}
                aria-describedby={`${id}-privacy`}
                onInput={(event) =>
                  resizeCinematicTextarea(event.currentTarget)
                }
              />
              <span id={`${id}-privacy`} className={styles.fieldHelp}>
                Hanya dibaca pemilik undangan.
                {siblingTypes.includes("guestbook")
                  ? " Untuk ucapan publik, gunakan bab Doa & Ucapan."
                  : ""}
              </span>
            </label>
            <TurnstileField />
            {error ? (
              <p id={`${id}-error`} className={styles.formError} role="alert">
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
