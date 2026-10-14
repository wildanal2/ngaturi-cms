"use client";

import { useEffect, useId, useRef, useState } from "react";
import { resizeCinematicTextarea } from "../cinematic/textarea";
import type { SectionRenderProps } from "../types";
import { TurnstileField } from "../turnstile-field";
import {
  useGuestbook,
  GUESTBOOK_NAME_MAX,
  GUESTBOOK_MESSAGE_MAX,
  GUESTBOOK_PAGE,
} from "./use-guestbook";
import styles from "../cinematic/cinematic.module.css";

export function GuestbookCinematicVintage({
  invitationId,
  guestName,
  isPreview,
}: SectionRenderProps) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [page, setPage] = useState(1);
  const {
    msgs,
    name,
    setName,
    message,
    setMessage,
    state,
    pendingNote,
    error,
    loading,
    loadError,
    retry,
    onSubmit,
  } = useGuestbook(invitationId, guestName, isPreview);
  useEffect(() => {
    if (textarea.current) resizeCinematicTextarea(textarea.current);
  }, [message]);
  const shown = msgs.slice(0, page * GUESTBOOK_PAGE);
  return (
    <div className={`${styles.interactionChapter} ${styles.guestbookChapter}`}>
      <header className={styles.chapterHeading}>
        <p className={styles.eyebrow}>Kata-kata yang kami simpan</p>
        <h2>Doa &amp; Ucapan</h2>
        <p>Tinggalkan doa dan kenangan untuk perjalanan baru kami.</p>
      </header>
      <div className={`${styles.parchment} ${styles.guestbookPage}`}>
        <form
          className={styles.cinematicForm}
          onSubmit={onSubmit}
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
              value={name}
              maxLength={GUESTBOOK_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label htmlFor={`${id}-message`}>
            Ucapan &amp; doa
            <textarea
              ref={textarea}
              id={`${id}-message`}
              name="message"
              required
              rows={4}
              value={message}
              maxLength={GUESTBOOK_MESSAGE_MAX}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={styles.fieldHelp}>
              {message.length} / {GUESTBOOK_MESSAGE_MAX}
            </span>
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
            {state === "sending" ? "Mengirim…" : "Kirim Ucapan"}
          </button>
          {state === "done" ? (
            <p className={styles.fieldHelp} role="status">
              {pendingNote
                ? "Terima kasih. Ucapan Anda menunggu persetujuan tuan rumah."
                : "Terima kasih atas doa dan ucapan Anda."}
            </p>
          ) : null}
          {isPreview ? (
            <p className={styles.fieldHelp}>
              Pratinjau — ucapan tidak akan dikirim.
            </p>
          ) : null}
        </form>
        <div className={styles.guestbookEntries} aria-busy={loading}>
          {loading ? (
            <p className={styles.fieldHelp}>Membuka buku tamu…</p>
          ) : loadError ? (
            <div>
              <p className={styles.fieldHelp}>Ucapan belum dapat dimuat.</p>
              <button
                type="button"
                className={styles.paperButton}
                onClick={retry}
              >
                Coba lagi
              </button>
            </div>
          ) : !shown.length ? (
            <p className={styles.emptyGuestbook}>
              Halaman pertama menanti doa dan ucapan Anda.
            </p>
          ) : null}
          <ul>
            {shown.map((entry) => (
              <li key={entry.id} className={styles.guestbookEntry}>
                <h3>{entry.name}</h3>
                <p>{entry.message}</p>
              </li>
            ))}
          </ul>
          {msgs.length > shown.length ? (
            <button
              type="button"
              className={styles.paperButton}
              onClick={() => setPage((n) => n + 1)}
            >
              Lihat ucapan lainnya
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
