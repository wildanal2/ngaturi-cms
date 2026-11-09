"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { lockLightboxScroll } from "../serambi-delima/lightbox-scroll";
import { GerbangPuspaMedia } from "./phase-two-media";
import { GP_PHASE_TWO_ASSETS as assets } from "./phase-two-assets";
import shared from "./phase-two.module.css";
import styles from "./phase-two-lightbox.module.css";

type ImageData = { url: string; caption?: string };

/** Native Ngaturi dialog/focus/keyboard behavior, with the baseline's measured chrome. */
export function GerbangPuspaLightbox({
  images,
  initialIndex,
  restoreFocusTo,
  onClose,
}: {
  images: readonly ImageData[];
  initialIndex: number;
  restoreFocusTo: HTMLElement;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    closeRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(initialIndex);
  const id = useId();
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const backdropStart = useRef(false);
  const index = ((selected % images.length) + images.length) % images.length;
  const image = images[index];
  const move = (direction: number) => setSelected(index + direction);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const view = dialog.ownerDocument.defaultView;
    const gutter =
      (view?.innerWidth ?? dialog.ownerDocument.documentElement.clientWidth) -
      dialog.ownerDocument.documentElement.clientWidth;
    const measure = () =>
      dialog.style.setProperty(
        "--gp-viewer-width",
        `${(view?.innerWidth ?? dialog.ownerDocument.documentElement.clientWidth) - gutter}px`,
      );
    measure();
    view?.addEventListener("resize", measure);
    const release = lockLightboxScroll(dialog.ownerDocument);
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      view?.removeEventListener("resize", measure);
      release();
      if (
        restoreFocusTo.isConnected &&
        !dialog.ownerDocument.querySelector("dialog[open]")
      )
        restoreFocusTo.focus({ preventScroll: true });
    };
  }, [restoreFocusTo]);

  function pointerDown(event: PointerEvent<HTMLDialogElement>) {
    backdropStart.current =
      event.target === event.currentTarget ||
      (event.target instanceof HTMLElement &&
        event.target.dataset.gpViewerStage === "true");
    if (!event.isPrimary || !["touch", "pen"].includes(event.pointerType))
      return;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      data-gerbang-puspa-lightbox
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ];
          const first = buttons[0],
            last = buttons.at(-1),
            focused = event.currentTarget.ownerDocument.activeElement;
          if (event.shiftKey && focused === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && focused === last) {
            event.preventDefault();
            first?.focus();
          }
        } else if (
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          images.length > 1 &&
          ["ArrowLeft", "ArrowRight"].includes(event.key)
        ) {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onPointerDown={pointerDown}
      onClick={(event) => {
        if (
          (event.target === event.currentTarget ||
            (event.target instanceof HTMLElement &&
              event.target.dataset.gpViewerStage === "true")) &&
          backdropStart.current
        )
          onClose();
        backdropStart.current = false;
      }}
      onPointerCancel={() => {
        swipe.current = null;
      }}
      onPointerUp={(event) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start || start.id !== event.pointerId || images.length < 2) return;
        const dx = event.clientX - start.x,
          dy = event.clientY - start.y;
        if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          backdropStart.current = false;
          move(dx < 0 ? 1 : -1);
        }
      }}
    >
      <div className={styles.stage} data-gp-viewer-stage="true">
        <h2 id={id} className={shared.srOnly}>
          Galeri foto
        </h2>
        <p className={shared.srOnly} aria-live="polite" aria-atomic="true">
          Foto {index + 1} dari {images.length}
          {image.caption ? `: ${image.caption}` : ""}
        </p>
        <GerbangPuspaMedia
          key={image.url || index}
          src={image.url}
          fallback={assets.gallery[index % assets.gallery.length]}
          alt={image.caption || `Foto ${index + 1}`}
          eager
          className={styles.image}
        />
        <nav className={styles.navigation} aria-label="Navigasi foto">
          {[-1, 1].map((direction) => (
            <button
              className={styles.arrow}
              key={direction}
              type="button"
              disabled={images.length < 2}
              aria-label={direction < 0 ? "Foto sebelumnya" : "Foto berikutnya"}
              onClick={() => move(direction)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={direction < 0 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
              </svg>
            </button>
          ))}
        </nav>
        <button
          ref={closeRef}
          className={styles.close}
          type="button"
          aria-label="Tutup galeri"
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
    </dialog>
  );
}
