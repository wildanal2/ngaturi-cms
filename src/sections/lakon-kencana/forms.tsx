"use client";

import { useId, useRef, useState } from "react";
import { Check, Copy, Heart, Send } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { useRsvp } from "../rsvp/use-rsvp";
import {
  useGuestbook,
  GUESTBOOK_NAME_MAX,
  GUESTBOOK_MESSAGE_MAX,
  GUESTBOOK_PAGE,
} from "../guestbook/use-guestbook";
import { TurnstileField } from "../turnstile-field";
import { dateLabel, guestLimit, records, text } from "./data";
import { Flourish, Section } from "./primitives";
import styles from "./lakon-kencana.module.css";

const attendance = [
  ["attending", "Hadir"],
  ["not_attending", "Berhalangan"],
  ["maybe", "Masih ragu"],
] as const;
export function RsvpLakon({
  props,
  invitationId,
  guestName,
  isPreview,
}: SectionRenderProps) {
  const [status, setStatus] = useState("");
  const { state, error, summary, onSubmit } = useRsvp(invitationId, isPreview);
  const id = useId();
  const sending = state === "sending",
    preview = !!isPreview || !invitationId,
    max = guestLimit(props.max_guests_per_person);
  return (
    <Section
      type="rsvp"
      title={text(props.title, "Kersa Rawuh?")}
      eyebrow={text(props.eyebrow, "KONFIRMASI KEHADIRAN")}
      intro={text(props.intro)}
      dark
    >
      <div className={styles.formPanel}>
        {state === "done" ? (
          <div className={styles.success} role="status">
            <Check size={32} aria-hidden="true" />
            <h3>Konfirmasi diterima</h3>
            <p>Terima kasih, kami menantikan kebersamaan ini.</p>
            <p>
              {attendance.find((a) => a[0] === summary?.status)?.[1]}
              {summary?.status === "attending"
                ? ` · ${summary.count} tamu`
                : ""}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} aria-busy={sending}>
            <input
              type="text"
              name="_hp"
              tabIndex={-1}
              autoComplete="off"
              hidden
            />
            <fieldset disabled={sending}>
              <legend>Apakah Anda berkenan hadir?</legend>
              <div className={styles.attendance}>
                {attendance.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.choice}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {status && (
              <div className={styles.formFields}>
                <input type="hidden" name="status" value={status} />
                <fieldset disabled={sending}>
                  <legend className={styles.srOnly}>Data konfirmasi</legend>
                  <label htmlFor={`${id}-name`}>
                    Nama lengkap
                    <input
                      id={`${id}-name`}
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                      defaultValue={guestName ?? ""}
                    />
                  </label>
                  {status === "attending" ? (
                    <label htmlFor={`${id}-count`}>
                      Jumlah tamu
                      <select
                        id={`${id}-count`}
                        name="guest_count"
                        defaultValue="1"
                      >
                        {Array.from({ length: max }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1} orang
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <input type="hidden" name="guest_count" value="1" />
                  )}
                  {props.require_phone === true && (
                    <label htmlFor={`${id}-phone`}>
                      Nomor WhatsApp
                      <input
                        id={`${id}-phone`}
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        maxLength={40}
                      />
                    </label>
                  )}
                  <label htmlFor={`${id}-message`}>
                    Catatan untuk tuan rumah (opsional)
                    <textarea
                      id={`${id}-message`}
                      name="message"
                      rows={3}
                      maxLength={1000}
                    />
                    <small>Catatan RSVP hanya dibaca oleh tuan rumah.</small>
                  </label>
                </fieldset>
                {!preview && <TurnstileField />}
                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className={styles.button}
                  disabled={sending || preview}
                >
                  <Send size={16} aria-hidden="true" />
                  {sending ? "Mengirim…" : "Kirim Konfirmasi"}
                </button>
              </div>
            )}
            {text(props.deadline) && (
              <p className={styles.small}>
                Mohon konfirmasi sebelum {dateLabel(text(props.deadline))}.
              </p>
            )}
            {preview && (
              <p className={styles.small}>
                Konfirmasi tersedia pada undangan yang dibagikan.
              </p>
            )}
          </form>
        )}
      </div>
    </Section>
  );
}

export function GuestbookLakon({
  props,
  invitationId,
  guestName,
  isPreview,
}: SectionRenderProps) {
  const book = useGuestbook(invitationId, guestName, isPreview);
  const id = useId();
  const [page, setPage] = useState(1);
  const shown = book.msgs.slice(0, page * GUESTBOOK_PAGE);
  const preview = !!isPreview || !invitationId;
  return (
    <Section
      type="guestbook"
      title={text(props.title, "Pangestu")}
      eyebrow={text(props.eyebrow, "DOA & UCAPAN")}
      intro={text(props.intro)}
    >
      <div className={styles.guestbookGrid}>
        <form
          className={styles.formPanel}
          onSubmit={book.onSubmit}
          aria-busy={book.state === "sending"}
        >
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            hidden
          />
          <fieldset disabled={book.state === "sending"}>
            <legend className={styles.srOnly}>Tulis doa dan ucapan</legend>
            <label htmlFor={`${id}-name`}>
              Nama Anda
              <input
                id={`${id}-name`}
                name="name"
                required
                autoComplete="name"
                value={book.name}
                maxLength={GUESTBOOK_NAME_MAX}
                onChange={(e) => book.setName(e.target.value)}
              />
            </label>
            <label htmlFor={`${id}-message`}>
              Doa untuk mempelai
              <textarea
                id={`${id}-message`}
                name="message"
                required
                rows={4}
                maxLength={GUESTBOOK_MESSAGE_MAX}
                value={book.message}
                onChange={(e) => book.setMessage(e.target.value)}
              />
              <small>
                {book.message.length} / {GUESTBOOK_MESSAGE_MAX}
              </small>
            </label>
          </fieldset>
          <p className={styles.small}>
            Ucapan bersifat publik dan dapat dimoderasi oleh tuan rumah.
          </p>
          {!preview && <TurnstileField />}
          {book.error && (
            <p className={styles.error} role="alert">
              {book.error}
            </p>
          )}
          <button
            type="submit"
            className={styles.button}
            disabled={book.state === "sending" || preview}
          >
            <Heart size={16} aria-hidden="true" />
            {book.state === "sending" ? "Mengirim…" : "Kirim Pangestu"}
          </button>
          {book.state === "done" && (
            <p className={styles.feedback} role="status">
              {book.pendingNote
                ? "Terima kasih. Ucapan menunggu persetujuan tuan rumah."
                : "Terima kasih atas doa dan ucapan Anda."}
            </p>
          )}
          {preview && (
            <p className={styles.small}>
              Ucapan tersedia pada undangan yang dibagikan.
            </p>
          )}
        </form>
        <div className={styles.wishes} aria-busy={book.loading}>
          {book.loading ? (
            <p role="status">Membuka serat kenangan…</p>
          ) : book.loadError ? (
            <div>
              <p>Ucapan belum dapat dimuat.</p>
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                onClick={book.retry}
              >
                Coba Lagi
              </button>
            </div>
          ) : !shown.length ? (
            <div className={styles.emptyWishes}>
              <Flourish />
              <p>Serat ini menanti doa pertama Anda.</p>
            </div>
          ) : null}
          <ul>
            {shown.map((entry, i) => (
              <li
                key={entry.id}
                className={styles.wishCard}
                style={{ rotate: `${i % 2 ? 1 : -1}deg` }}
              >
                <p>“{entry.message}”</p>
                <strong>{entry.name}</strong>
              </li>
            ))}
          </ul>
          {shown.length < book.msgs.length && (
            <button
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setPage(page + 1)}
            >
              Baca Ucapan Lainnya
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}

export function GiftLakon({ props }: SectionRenderProps) {
  const accounts = records(props.bank_accounts).filter(
    (a) => text(a.bank_name) && text(a.account_number),
  );
  const [feedback, setFeedback] = useState<{
    index: number;
    ok: boolean;
  } | null>(null);
  const copying = useRef(false);
  if (!accounts.length) return null;
  const copy = async (index: number) => {
    if (copying.current) return;
    copying.current = true;
    try {
      await navigator.clipboard.writeText(text(accounts[index].account_number));
      setFeedback({ index, ok: true });
    } catch {
      setFeedback({ index, ok: false });
    } finally {
      copying.current = false;
    }
  };
  return (
    <Section
      type="gift"
      title={text(props.title, "Tandha Tresna")}
      eyebrow={text(props.eyebrow, "TANDA KASIH")}
      intro={text(props.intro)}
    >
      <div className={styles.envelopes}>
        {accounts.map((account, i) => (
          <details key={i} className={styles.envelope}>
            <summary>
              <span className={styles.envelopeSeal}>✦</span>
              <span>Buka amplop {text(account.bank_name)}</span>
            </summary>
            <div className={styles.account}>
              <p className={styles.eyebrow}>{text(account.bank_name)}</p>
              <strong className={styles.accountNumber}>
                {text(account.account_number)}
              </strong>
              <p>a.n. {text(account.account_name)}</p>
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                aria-label={`Salin rekening ${text(account.bank_name)}`}
                onClick={() => void copy(i)}
              >
                {feedback?.index === i && feedback.ok ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}{" "}
                Salin Nomor
              </button>
              {feedback?.index === i && (
                <p
                  role="status"
                  className={feedback.ok ? styles.feedback : styles.error}
                >
                  {feedback.ok
                    ? "Nomor rekening tersalin."
                    : "Salinan gagal. Pilih dan salin nomor rekening di atas."}
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}
