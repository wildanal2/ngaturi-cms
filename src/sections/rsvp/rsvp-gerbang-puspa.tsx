"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRsvp } from "./use-rsvp";
import { TurnstileField } from "../turnstile-field";
import type { SectionRenderProps } from "../types";
import {
  adjacentGerbangSection,
  invitationPhone,
} from "../gerbang-puspa/phase-three-data";
import {
  createGerbangFormSurface,
  gerbangFormOwners,
  useGerbangFormSurface,
} from "../gerbang-puspa/phase-three-surface";
import { GerbangPuspaFormsDialog } from "../gerbang-puspa/phase-three-dialog";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "../gerbang-puspa/phase-three-forms.module.css";

export function RsvpGerbangPuspa({
  props,
  invitationId,
  guestName,
  isPreview,
  inCanvas,
}: SectionRenderProps) {
  const preview = isPreview || inCanvas;
  const { state, error, summary, onSubmit } = useRsvp(invitationId, preview);
  const [surface] = useState(() => createGerbangFormSurface());
  const snapshot = useGerbangFormSurface(surface);
  const root = useRef<HTMLElement>(null),
    success = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false),
    [paired, setPaired] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [phone, setPhone] = useState(""),
    [prefix, setPrefix] = useState("+62");
  const id = useId(),
    maximum = Math.max(1, Math.floor(Number(props.max_guests_per_person) || 2));
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    gerbangFormOwners.set(element, surface);
    const measure = () =>
      setPaired(
        !inCanvas &&
          !!adjacentGerbangSection(element, "previous")?.querySelector(
            "[data-gerbang-puspa-countdown]",
          ),
      );
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(
      element.closest("[data-gerbang-puspa]") ?? element.parentElement!,
      { childList: true, subtree: true },
    );
    element.dispatchEvent(new Event("gp:form-surface", { bubbles: true }));
    return () => {
      observer.disconnect();
      gerbangFormOwners.delete(element);
    };
  }, [surface, inCanvas]);
  useEffect(() => {
    if (state === "done" && snapshot.active === "rsvp")
      success.current?.focus();
  }, [state, snapshot.active]);

  const form = (
    <div hidden={!inCanvas && snapshot.active !== "rsvp"} data-gp-rsvp-panel>
      {state === "done" ? (
        <p ref={success} tabIndex={-1} className={styles.success} role="status">
          Terima kasih! Konfirmasi kehadiran Anda sudah kami terima.
          {summary && (
            <span className={styles.summary}>
              {summary.status === "attending"
                ? "Hadir"
                : summary.status === "not_attending"
                  ? "Tidak hadir"
                  : "Masih ragu"}{" "}
              · {summary.count} tamu
            </span>
          )}
        </p>
      ) : (
        <form className={styles.form} data-gp-rsvp-form onSubmit={onSubmit}>
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            hidden
          />
          <div className={styles.formGroup}>
            <label htmlFor={`${id}-name`}>Nama</label>
            <input
              id={`${id}-name`}
              name="name"
              required
              defaultValue={guestName ?? ""}
              placeholder="Nama"
              autoComplete="name"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor={`${id}-count`}>Jumlah tamu</label>
            <input
              id={`${id}-count`}
              name="guest_count"
              type="number"
              min={1}
              max={maximum}
              defaultValue={1}
              required
            />
          </div>
          {!!props.require_phone && (
            <div className={styles.formGroup}>
              <label htmlFor={`${id}-phone`}>No WhatsApp</label>
              <div className={styles.phoneField}>
                <select
                  className={styles.country}
                  aria-label="Kode negara"
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value)}
                >
                  <option value="+62" aria-label="Indonesia +62">
                    +62
                  </option>
                  <option value="+61" aria-label="Australia +61">
                    +61
                  </option>
                  <option value="+43" aria-label="Austria +43">
                    +43
                  </option>
                </select>
                <input
                  id={`${id}-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="No WhatsApp"
                />
                <input
                  type="hidden"
                  name="phone"
                  value={invitationPhone(prefix, phone)}
                />
              </div>
            </div>
          )}
          <div className={styles.formGroup}>
            <label htmlFor={`${id}-status`}>Kehadiran</label>
            <select id={`${id}-status`} name="status" defaultValue="" required>
              <option value="">Kehadiran</option>
              <option value="attending">Hadir</option>
              <option value="not_attending">Tidak Hadir</option>
              <option value="maybe">Masih ragu</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor={`${id}-message`}>
              Pesan untuk tuan rumah (opsional)
            </label>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={3}
              placeholder="Pesan untuk tuan rumah"
            />
          </div>
          {!preview && invitationId && snapshot.active === "rsvp" && (
            <TurnstileField />
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button
            className={styles.submitButton}
            type="submit"
            disabled={state === "sending" || preview || !invitationId}
          >
            {state === "sending" ? "Mengirim..." : "Kirim konfirmasi"}
          </button>
          {preview && (
            <p className={styles.notice}>
              Pengiriman dinonaktifkan dalam pratinjau.
            </p>
          )}
        </form>
      )}
    </div>
  );
  return (
    <section
      ref={root}
      className={
        inCanvas
          ? styles.inline
          : paired
            ? styles.joinedEntry
            : `${foundation.scene} ${styles.entry}`
      }
      data-gerbang-puspa-rsvp
    >
      {inCanvas ? (
        <>
          <h2 className={styles.modalTitle}>RSVP</h2>
          {form}
        </>
      ) : (
        <button
          type="button"
          className={paired ? styles.hiddenLaunch : foundation.button}
          tabIndex={paired ? -1 : 0}
          data-gp-rsvp-launch
          onClick={() => {
            setOpener(
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null,
            );
            setOpen(true);
          }}
        >
          Konfirmasi &amp; Kirim Ucapan
        </button>
      )}
      {open && (
        <GerbangPuspaFormsDialog
          surface={surface}
          form={form}
          onClose={() => setOpen(false)}
          restoreFocusTo={opener}
        />
      )}
    </section>
  );
}
