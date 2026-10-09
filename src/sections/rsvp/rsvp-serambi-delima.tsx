"use client";

import { useId } from "react";
import type { SectionRenderProps } from "../types";
import { TurnstileField } from "../turnstile-field";
import { useRsvp } from "./use-rsvp";
import {
  SerambiEntrance,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import {
  SerambiField,
  SerambiNotice,
  SerambiSubmit,
} from "../serambi-delima/form-primitives";
import surfaces from "../serambi-delima/sections.module.css";
import styles from "../serambi-delima/phase-four.module.css";

export function RsvpSerambiDelima({
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
  const { state, error, summary, onSubmit } = useRsvp(invitationId, isPreview);
  const id = useId();
  const preview = !!isPreview || !invitationId;
  const sending = state === "sending";
  const attendance: Record<string, string> = {
    attending: "Hadir",
    not_attending: "Tidak hadir",
    maybe: "Masih ragu",
  };
  return (
    <SerambiSection
      type="rsvp"
      title="Konfirmasi Kehadiran"
      inCanvas={inCanvas}
    >
      <SerambiEntrance inCanvas={inCanvas}>
        {state === "done" ? (
          <div className={`${surfaces.panel} ${styles.successPanel}`}>
            <span className={surfaces.panelJewel} aria-hidden="true" />
            <SerambiNotice tone="success">
              <p>Terima kasih! Konfirmasi Anda sudah kami terima.</p>
              {summary && attendance[summary.status] ? (
                <p className={styles.summary}>
                  {attendance[summary.status]}
                  {summary.status === "attending" && summary.count
                    ? ` · ${summary.count} tamu`
                    : ""}
                </p>
              ) : null}
            </SerambiNotice>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            aria-busy={sending}
            aria-describedby={error ? `${id}-error` : undefined}
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
              <legend className={styles.srOnly}>
                Detail konfirmasi kehadiran
              </legend>
              <SerambiField id={`${id}-name`} label="Nama">
                <input
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  required
                  defaultValue={guestName ?? ""}
                  className={styles.input}
                />
              </SerambiField>
              {p.require_phone ? (
                <SerambiField id={`${id}-phone`} label="Nomor WhatsApp">
                  <input
                    id={`${id}-phone`}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    className={styles.input}
                  />
                </SerambiField>
              ) : null}
              <SerambiField id={`${id}-status`} label="Kehadiran">
                <select
                  id={`${id}-status`}
                  name="status"
                  required
                  className={styles.input}
                >
                  <option value="attending">Hadir</option>
                  <option value="not_attending">Tidak hadir</option>
                  <option value="maybe">Masih ragu</option>
                </select>
              </SerambiField>
              <SerambiField id={`${id}-count`} label="Jumlah tamu">
                <input
                  id={`${id}-count`}
                  name="guest_count"
                  type="number"
                  min={1}
                  max={p.max_guests_per_person ?? 2}
                  defaultValue={1}
                  className={styles.input}
                />
              </SerambiField>
              <SerambiField id={`${id}-message`} label="Catatan (opsional)">
                <textarea
                  id={`${id}-message`}
                  name="message"
                  rows={4}
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
                  Konfirmasi tersedia pada undangan yang dibagikan.
                </SerambiNotice>
              ) : null}
              {error ? (
                <SerambiNotice id={`${id}-error`} tone="error">
                  {error}
                </SerambiNotice>
              ) : null}
              <div className={styles.actions}>
                <SerambiSubmit sending={sending} disabled={preview}>
                  Kirim konfirmasi
                </SerambiSubmit>
              </div>
            </div>
          </form>
        )}
      </SerambiEntrance>
    </SerambiSection>
  );
}
