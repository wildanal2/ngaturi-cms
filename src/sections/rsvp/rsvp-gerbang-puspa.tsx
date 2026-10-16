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
import {
  GerbangPuspaFormsDialog,
  GerbangPuspaFormAction,
} from "../gerbang-puspa/phase-three-dialog";
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
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false),
    [paired, setPaired] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [phone, setPhone] = useState(""),
    [prefix, setPrefix] = useState("+62");
  const [attendance, setAttendance] = useState("");
  const absent = attendance === "not_attending";
  const id = useId(),
    maximum = Math.min(
      20,
      Math.max(1, Math.floor(Number(props.max_guests_per_person) || 2)),
    );
  const formId = `${id}-form`;
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
    const status = success.current;
    if (state === "done" && status?.getClientRects().length) status.focus();
  }, [state]);
  useEffect(() => {
    if (state === "error") errorRef.current?.focus();
  }, [state, error]);

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
              {summary.status !== "not_attending" && (
                <>· {summary.count} tamu</>
              )}
            </span>
          )}
        </p>
      ) : (
        <form
          id={formId}
          className={styles.form}
          data-gp-rsvp-form
          onSubmit={onSubmit}
          aria-busy={state === "sending"}
        >
          <p className={styles.formIntro}>
            Konfirmasi dan pesan ini dikirim kepada tuan rumah.
          </p>
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
            <label htmlFor={`${id}-status`}>Kehadiran</label>
            <select
              id={`${id}-status`}
              name="status"
              value={attendance}
              onChange={(event) => setAttendance(event.target.value)}
              required
            >
              <option value="">Pilih kehadiran</option>
              <option value="attending">Hadir</option>
              <option value="not_attending">Tidak Hadir</option>
              <option value="maybe">Masih ragu</option>
            </select>
          </div>
          {/* The native endpoint requires a positive count for every status.
              Absence retains its canonical value without suggesting attending guests. */}
          {absent && <input type="hidden" name="guest_count" value="1" />}
          <div className={styles.formGroup} hidden={absent}>
            <label htmlFor={`${id}-count`}>Jumlah tamu</label>
            <input
              id={`${id}-count`}
              name="guest_count"
              type="number"
              min={1}
              max={maximum}
              defaultValue={1}
              required
              disabled={absent}
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
            <label htmlFor={`${id}-message`}>
              Pesan untuk tuan rumah (opsional)
            </label>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={3}
              placeholder="Pesan untuk tuan rumah"
            />
            <small className={styles.fieldHint}>
              Pesan pribadi, tidak ditampilkan di buku tamu.
            </small>
          </div>
          {!preview && invitationId && snapshot.active === "rsvp" && (
            <TurnstileField />
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              className={styles.error}
              role="alert"
            >
              {error}
            </p>
          )}
          <GerbangPuspaFormAction
            surface={surface}
            kind="rsvp"
            inCanvas={inCanvas}
          >
            <button
              className={styles.submitButton}
              type="submit"
              form={formId}
              disabled={state === "sending" || preview || !invitationId}
            >
              {state === "sending" ? "Mengirim..." : "Kirim konfirmasi"}
            </button>
          </GerbangPuspaFormAction>
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
            surface.update({ active: "rsvp" });
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
