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
  formKind = "rsvp",
}: {
  surface: GerbangFormSurface;
  form: ReactNode;
  list?: ReactNode;
  onClose: () => void;
  restoreFocusTo?: HTMLElement | null;
  title?: string;
  formKind?: "rsvp" | "wishes";
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
  const actionRef = useCallback(
    (node: HTMLDivElement | null) => surface.update({ actionTarget: node }),
    [surface],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const changeTab = (active: "rsvp" | "wishes") => {
    surface.update({ active });
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const doc = dialog.ownerDocument;
    const release = lockLightboxScroll(doc);
    const viewport = doc.defaultView?.visualViewport;
    const measure = () => {
      if (!viewport) return;
      dialog.style.setProperty("--gp-dialog-height", `${viewport.height}px`);
      dialog.style.setProperty("--gp-dialog-top", `${viewport.offsetTop}px`);
    };
    measure();
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    try {
      dialog.showModal();
    } catch (error) {
      release();
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      throw error;
    }
    // Start with context and a reachable close control; touch entry must not
    // summon the onscreen keyboard before the guest has read the dialog.
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      release();
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
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
          <header className={styles.modalHeader}>
            <h2 id={id} className={styles.modalTitle}>
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="Tutup RSVP dan ucapan"
              onClick={onClose}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          {snapshot.paired && (
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Pilih formulir"
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "rsvp"
                    : event.key === "End"
                      ? "wishes"
                      : snapshot.active === "rsvp"
                        ? "wishes"
                        : "rsvp";
                changeTab(next);
                event.currentTarget
                  .querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
                  ?.focus();
              }}
            >
              {(["rsvp", "wishes"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`${id}-${tab}-tab`}
                  data-tab={tab}
                  aria-controls={`${id}-${tab}-panel`}
                  aria-selected={snapshot.active === tab}
                  tabIndex={snapshot.active === tab ? 0 : -1}
                  onClick={() => changeTab(tab)}
                >
                  {tab === "rsvp" ? "Konfirmasi" : "Ucapan"}
                </button>
              ))}
            </div>
          )}
          <div
            ref={scrollRef}
            className={styles.modalScroll}
            data-gp-form-scroll
          >
            <div
              id={`${id}-rsvp-panel`}
              role={snapshot.paired ? "tabpanel" : undefined}
              aria-labelledby={snapshot.paired ? `${id}-rsvp-tab` : undefined}
              hidden={snapshot.active !== "rsvp"}
            >
              {formKind === "rsvp" && form}
            </div>
            <div
              id={`${id}-wishes-panel`}
              role={snapshot.paired ? "tabpanel" : undefined}
              aria-labelledby={snapshot.paired ? `${id}-wishes-tab` : undefined}
              hidden={snapshot.active !== "wishes"}
            >
              <div ref={formRef}>{formKind === "wishes" && form}</div>
              <div ref={listRef}>{list}</div>
            </div>
          </div>
          <div
            ref={actionRef}
            className={styles.modalFooter}
            data-gp-form-actions
          />
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

/** The real form owns submission; only its button moves to the bounded footer. */
export function GerbangPuspaFormAction({
  surface,
  kind,
  inCanvas,
  children,
}: {
  surface: GerbangFormSurface;
  kind: "rsvp" | "wishes";
  inCanvas?: boolean;
  children: ReactNode;
}) {
  const snapshot = useGerbangFormSurface(surface);
  if (inCanvas) return children;
  if (snapshot.active !== kind) return null;
  return snapshot.actionTarget
    ? createPortal(children, snapshot.actionTarget)
    : children;
}
