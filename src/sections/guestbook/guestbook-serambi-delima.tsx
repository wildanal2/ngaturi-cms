"use client";

import { useId, useState } from "react";
import type { SectionRenderProps } from "../types";
import { TurnstileField } from "../turnstile-field";
import {
  useGuestbook,
  GUESTBOOK_NAME_MAX,
  GUESTBOOK_MESSAGE_MAX,
  GUESTBOOK_PAGE,
  type GuestbookMessage,
} from "./use-guestbook";
import {
  SerambiEntrance,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import {
  SerambiField,
  SerambiNotice,
  SerambiSubmit,
} from "../serambi-delima/form-primitives";
import foundation from "../serambi-delima/serambi-delima.module.css";
import surfaces from "../serambi-delima/sections.module.css";
import styles from "../serambi-delima/phase-four.module.css";

function Wish({ message }: { message: GuestbookMessage }) {
  const date = new Date(message.createdAt);
  const validDate = !Number.isNaN(date.getTime());
  return (
    <li className={styles.wishCard}>
      <div className={styles.wishHeader}>
        <p className={styles.wishName} dir="auto">
          {message.name}
        </p>
        {validDate ? (
          <time dateTime={message.createdAt} className={styles.wishDate}>
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Jakarta",
            }).format(date)}
          </time>
        ) : null}
      </div>
      <p className={styles.wishMessage} dir="auto">
        {message.message}
      </p>
    </li>
  );
}

export function GuestbookSerambiDelima({
  invitationId,
  guestName,
  isPreview,
  inCanvas,
}: SectionRenderProps) {
  const book = useGuestbook(invitationId, guestName, isPreview);
  const [page, setPage] = useState(1);
  const id = useId();
  const preview = !!isPreview || !invitationId;
  const sending = book.state === "sending";
  const shown = book.msgs.slice(0, page * GUESTBOOK_PAGE);
  return (
    <SerambiSection type="guestbook" title="Ucapan & Doa" inCanvas={inCanvas}>
      <SerambiEntrance inCanvas={inCanvas}>
        <form
          onSubmit={book.onSubmit}
          aria-busy={sending}
          aria-describedby={book.error ? `${id}-error` : undefined}
          className={`${surfaces.panel} ${styles.formPanel}`}
        >
          <span className={surfaces.panelJewel} aria-hidden="true" />
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            hidden
          />
          <fieldset disabled={sending} className={styles.formFields}>
            <legend className={styles.srOnly}>Tulis ucapan dan doa</legend>
            <SerambiField
              id={`${id}-name`}
              label="Nama"
              hint={`${book.name.length}/${GUESTBOOK_NAME_MAX} karakter`}
            >
              <input
                id={`${id}-name`}
                name="name"
                autoComplete="name"
                required
                maxLength={GUESTBOOK_NAME_MAX}
                value={book.name}
                onChange={(event) => book.setName(event.target.value)}
                aria-describedby={`${id}-name-hint`}
                className={styles.input}
              />
            </SerambiField>
            <SerambiField
              id={`${id}-message`}
              label="Ucapan & doa"
              hint={`${book.message.length}/${GUESTBOOK_MESSAGE_MAX} karakter`}
            >
              <textarea
                id={`${id}-message`}
                name="message"
                rows={5}
                required
                maxLength={GUESTBOOK_MESSAGE_MAX}
                value={book.message}
                onChange={(event) => book.setMessage(event.target.value)}
                aria-describedby={`${id}-message-hint`}
                className={styles.input}
              />
            </SerambiField>
          </fieldset>
          {!preview ? (
            <div className={styles.challenge}>
              <TurnstileField />
            </div>
          ) : null}
          <div className={styles.formFooter}>
            {preview ? (
              <SerambiNotice>
                Ucapan dapat dikirim pada undangan yang dibagikan.
              </SerambiNotice>
            ) : null}
            {book.error ? (
              <SerambiNotice id={`${id}-error`} tone="error">
                {book.error}
              </SerambiNotice>
            ) : null}
            {book.state === "done" ? (
              <SerambiNotice tone="success">
                {book.pendingNote
                  ? "Ucapan Anda menunggu persetujuan tuan rumah."
                  : "Terima kasih! Ucapan Anda sudah kami terima."}
              </SerambiNotice>
            ) : null}
            <div className={styles.actions}>
              <SerambiSubmit sending={sending} disabled={preview}>
                Kirim ucapan
              </SerambiSubmit>
            </div>
          </div>
        </form>
      </SerambiEntrance>
      <SerambiEntrance inCanvas={inCanvas} className={styles.wishes}>
        <h3 id={`${id}-wishes`} className={styles.wishesTitle}>
          Doa dari Tamu
        </h3>
        {book.loading ? <SerambiNotice>Memuat ucapan…</SerambiNotice> : null}
        {book.loadError && !book.loading ? (
          <div className={styles.listStatus}>
            <SerambiNotice tone="error">
              Ucapan belum dapat dimuat. Silakan coba lagi.
            </SerambiNotice>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={book.retry}
                className={`${foundation.button} ${styles.action}`}
              >
                Coba lagi
              </button>
            </div>
          </div>
        ) : null}
        {!book.loading && !book.loadError && !shown.length ? (
          <SerambiNotice>
            Belum ada ucapan. Jadilah yang pertama berbagi doa.
          </SerambiNotice>
        ) : null}
        <ul
          className={styles.wishList}
          aria-labelledby={`${id}-wishes`}
          aria-busy={book.loading}
        >
          {shown.map((message) => (
            <Wish key={message.id} message={message} />
          ))}
        </ul>
        {book.msgs.length > shown.length ? (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className={`${foundation.button} ${styles.action}`}
            >
              Muat lebih banyak
            </button>
          </div>
        ) : null}
      </SerambiEntrance>
    </SerambiSection>
  );
}
