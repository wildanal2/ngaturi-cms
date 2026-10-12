"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockLightboxScroll } from "../serambi-delima/lightbox-scroll";
import {
  useGerbangFormSurface,
  type GerbangFormSurface,
} from "./phase-three-surface";
import styles from "./phase-three-forms.module.css";

export function GerbangPuspaFormsDialog({
  surface,
  form,
  list,
  onClose,
  restoreFocusTo,
  title = "RSVP",
}: {
  surface: GerbangFormSurface;
  form: ReactNode;
  list?: ReactNode;
  onClose: () => void;
  restoreFocusTo?: HTMLElement | null;
  title?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    closeRef = useRef<HTMLButtonElement>(null);
  const id = useId(),
    snapshot = useGerbangFormSurface(surface);
  const formRef = useCallback(
    (node: HTMLDivElement | null) => surface.update({ formTarget: node }),
    [surface],
  );
  const listRef = useCallback(
    (node: HTMLDivElement | null) => surface.update({ listTarget: node }),
    [surface],
  );
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const doc = dialog.ownerDocument;
    const release = lockLightboxScroll(doc);
    try {
      dialog.showModal();
    } catch (error) {
      release();
      throw error;
    }
    (
      [
        ...dialog.querySelectorAll<HTMLElement>(
          "input:not([type=hidden]):not([hidden])",
        ),
      ].find(
        (input) => input.getClientRects().length && !input.closest("[hidden]"),
      ) ?? closeRef.current
    )?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      release();
      if (restoreFocusTo?.isConnected && !doc.querySelector("dialog[open]"))
        restoreFocusTo.focus({ preventScroll: true });
    };
  }, [restoreFocusTo]);
  return createPortal(
    <dialog
      ref={ref}
      className={styles.dialog}
      data-gerbang-puspa-form-dialog
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const nodes = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not([type=hidden]),select,textarea,a[href],[tabindex='0']",
          ),
        ].filter(
          (e) =>
            e.tabIndex >= 0 &&
            e.getClientRects().length &&
            !e.closest("[hidden]"),
        );
        const first = nodes[0],
          last = nodes.at(-1),
          active = event.currentTarget.ownerDocument.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={styles.viewport}>
        <div className={styles.modalDialog}>
          <div className={styles.modalScroll} data-gp-form-scroll>
            <h2
              id={id}
              className={`${styles.modalTitle} ${snapshot.paired ? styles.pairedTitle : ""}`}
            >
              {title}
            </h2>
            {snapshot.paired && (
              <div className={styles.tabs} aria-label="Pilih formulir">
                <button
                  type="button"
                  aria-pressed={snapshot.active === "rsvp"}
                  onClick={() => surface.update({ active: "rsvp" })}
                >
                  Konfirmasi
                </button>
                <button
                  type="button"
                  aria-pressed={snapshot.active === "wishes"}
                  onClick={() => surface.update({ active: "wishes" })}
                >
                  Ucapan
                </button>
              </div>
            )}
            <div ref={formRef}>{form}</div>
            <div ref={listRef}>{list}</div>
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          aria-label="Tutup RSVP dan ucapan"
          onClick={onClose}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
