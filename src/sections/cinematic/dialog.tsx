"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { lockLightboxScroll } from "../serambi-delima/lightbox-scroll";
import { cancelCinematicScroll } from "./scroll";
import { cinematicRoot } from "./chrome";
import styles from "./cinematic.module.css";

/** Native modal owns focus/inert; the same invitation owner stays at its position. */
export function CinematicDialog({
  title,
  children,
  onClose,
  opener,
  kind,
  onKeyDown,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  opener: HTMLElement | null;
  kind: "chapters" | "lightbox";
  onKeyDown?: (key: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const root = cinematicRoot(dialog);
    const scroller =
      root?.closest<HTMLElement>("[data-device-scroller]") ??
      dialog
        ?.closest("[data-device-frame-viewport]")
        ?.querySelector<HTMLElement>("[data-device-scroller]");
    const owner = scroller ?? window;
    cancelCinematicScroll(owner);
    if (root) {
      root.dataset.cinematicOverlay = kind;
      root.dispatchEvent(new Event("cinematic:overlay"));
    }
    const previousOverflow = scroller?.style.overflow;
    const releaseDocument = lockLightboxScroll(document);
    const release = () => {
      releaseDocument();
      if (scroller) {
        scroller.style.overflow = previousOverflow ?? "";
      }
    };
    if (scroller) scroller.style.overflow = "hidden";
    dialog.showModal();
    close.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      release();
      if (root) delete root.dataset.cinematicOverlay;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener, kind]);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-cinematic-dialog={kind}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled),a[href],[tabindex="0"]',
            ),
          ].filter((node) => node.getClientRects().length);
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        } else if (
          ["ArrowLeft", "ArrowRight"].includes(event.key) &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          onKeyDown
        ) {
          event.preventDefault();
          onKeyDown(event.key);
        }
      }}
    >
      <div className={styles.dialogSurface}>
        <header className={styles.dialogHeader}>
          <h2 id={id}>{title}</h2>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label={kind === "chapters" ? "Tutup daftar bab" : "Tutup foto"}
          >
            <X size={20} aria-hidden="true" />
            <span>Tutup</span>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
