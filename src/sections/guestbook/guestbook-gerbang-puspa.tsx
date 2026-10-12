"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useGuestbook,
  GUESTBOOK_NAME_MAX,
  GUESTBOOK_MESSAGE_MAX,
  GUESTBOOK_PAGE,
} from "./use-guestbook";
import { TurnstileField } from "../turnstile-field";
import type { SectionRenderProps } from "../types";
import {
  adjacentGerbangSection,
  wishInitials,
  wishTimestamp,
} from "../gerbang-puspa/phase-three-data";
import {
  createGerbangFormSurface,
  gerbangFormOwners,
  useGerbangFormSurface,
  type GerbangFormSurface,
} from "../gerbang-puspa/phase-three-surface";
import { GerbangPuspaFormsDialog } from "../gerbang-puspa/phase-three-dialog";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "../gerbang-puspa/phase-three-forms.module.css";

export function GuestbookGerbangPuspa({
  invitationId,
  guestName,
  isPreview,
  inCanvas,
}: SectionRenderProps) {
  const preview = isPreview || inCanvas;
  const book = useGuestbook(invitationId, guestName, preview);
  const [owner, setOwner] = useState<GerbangFormSurface | null>(null),
    [own] = useState(() => createGerbangFormSurface("wishes"));
  const surface = owner ?? own,
    snapshot = useGerbangFormSurface(surface);
  const root = useRef<HTMLElement>(null),
    success = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(1);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const id = useId();
  useEffect(() => {
    const element = root.current;
    if (!element || inCanvas) return;
    const parent =
      element.closest("[data-gerbang-puspa]") ?? element.parentElement!;
    const measure = () => {
      const previous = adjacentGerbangSection(
        element,
        "previous",
      )?.querySelector<HTMLElement>("[data-gerbang-puspa-rsvp]");
      setOwner(previous ? (gerbangFormOwners.get(previous) ?? null) : null);
    };
    measure();
    parent.addEventListener("gp:form-surface", measure);
    const observer = new MutationObserver(measure);
    observer.observe(parent, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      parent.removeEventListener("gp:form-surface", measure);
    };
  }, [inCanvas]);
  useEffect(() => {
    owner?.update({ paired: true });
    return () => owner?.update({ paired: false });
  }, [owner]);
  useEffect(() => {
    if (book.state === "done" && snapshot.active === "wishes")
      success.current?.focus();
  }, [book.state, snapshot.active]);
  const form = (
    <div data-gp-guestbook-panel>
      <form
        className={styles.form}
        data-gp-guestbook-form
        onSubmit={book.onSubmit}
      >
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" hidden />
        <div className={styles.formGroup}>
          <label htmlFor={`${id}-name`}>Nama</label>
          <input
            id={`${id}-name`}
            name="name"
            required
            maxLength={GUESTBOOK_NAME_MAX}
            value={book.name}
            onChange={(event) => book.setName(event.target.value)}
            placeholder="Nama"
            autoComplete="name"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor={`${id}-message`}>Komentar atau ucapan</label>
          <textarea
            id={`${id}-message`}
            name="message"
            required
            maxLength={GUESTBOOK_MESSAGE_MAX}
            rows={3}
            value={book.message}
            onChange={(event) => book.setMessage(event.target.value)}
            placeholder="Komentar atau Ucapan"
          />
          <span className={styles.counter}>
            {book.message.length}/{GUESTBOOK_MESSAGE_MAX}
          </span>
        </div>
        {!preview && invitationId && <TurnstileField />}
        {book.error && (
          <p className={styles.error} role="alert">
            {book.error}
          </p>
        )}
        <button
          className={styles.submitButton}
          type="submit"
          disabled={book.state === "sending" || preview || !invitationId}
        >
          {book.state === "sending" ? "Mengirim..." : "Kirim ucapan"}
        </button>
        {book.state === "done" && (
          <p
            ref={success}
            tabIndex={-1}
            className={styles.success}
            role="status"
          >
            {book.pendingNote
              ? "Ucapan diterima. Ucapan yang menunggu persetujuan tuan rumah akan tampil setelah disetujui."
              : "Terima kasih! Ucapan Anda sudah diterima."}
          </p>
        )}
        {preview && (
          <p className={styles.notice}>
            Pengiriman dinonaktifkan dalam pratinjau.
          </p>
        )}
      </form>
    </div>
  );
  const shown = book.msgs.slice(0, page * GUESTBOOK_PAGE);
  const list = (
    <div className={styles.wishes} data-gp-wishes>
      {book.loading && <p role="status">Memuat ucapan...</p>}
      {book.loadError && (
        <div role="alert">
          <p>Ucapan belum dapat dimuat.</p>
          <button type="button" className={styles.retry} onClick={book.retry}>
            Coba lagi
          </button>
        </div>
      )}
      {!book.loading && !book.loadError && !book.msgs.length && (
        <p>Jadilah yang pertama memberi ucapan.</p>
      )}
      {shown.map((wish, index) => (
        <article className={styles.wish} key={wish.id}>
          <span
            className={styles.avatar}
            aria-hidden="true"
            style={{
              backgroundColor: [
                "#455cff",
                "#698794",
                "#04bfa8",
                "#d3ad57",
                "#b086c5",
              ][index % 5],
            }}
          >
            {wishInitials(wish.name)}
          </span>
          <div className={styles.wishBody}>
            <p className={styles.wishName}>{wish.name}</p>
            <p className={styles.wishComment}>{wish.message}</p>
            {wishTimestamp(wish.createdAt) && (
              <p className={styles.wishTime}>{wishTimestamp(wish.createdAt)}</p>
            )}
          </div>
        </article>
      ))}
      {book.msgs.length > shown.length && (
        <button
          type="button"
          className={styles.retry}
          onClick={() => setPage((n) => n + 1)}
        >
          Muat lebih banyak
        </button>
      )}
    </div>
  );
  return (
    <section
      ref={root}
      className={
        inCanvas
          ? styles.inline
          : owner
            ? styles.joinedEntry
            : `${foundation.scene} ${styles.entry}`
      }
      data-gerbang-puspa-guestbook
    >
      {inCanvas ? (
        <>
          <h2 className={styles.modalTitle}>Ucapan &amp; Doa</h2>
          {form}
          {list}
        </>
      ) : (
        !owner && (
          <button
            type="button"
            className={foundation.button}
            onClick={() => {
              setOpener(
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null,
              );
              setOpen(true);
            }}
          >
            Ucapan &amp; Doa
          </button>
        )
      )}
      {owner &&
        snapshot.formTarget &&
        snapshot.active === "wishes" &&
        createPortal(form, snapshot.formTarget)}
      {owner && snapshot.listTarget && createPortal(list, snapshot.listTarget)}
      {open && !owner && (
        <GerbangPuspaFormsDialog
          surface={own}
          form={form}
          list={list}
          title="Ucapan & Doa"
          onClose={() => setOpen(false)}
          restoreFocusTo={opener}
        />
      )}
    </section>
  );
}
