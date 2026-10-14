"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { GalleryMedia, type GalleryImageData } from "./gallery-media";
import { serambiTheme } from "./primitives";
import { lockLightboxScroll } from "./lightbox-scroll";
import styles from "./phase-three.module.css";

export function SerambiLightbox({
  images,
  initialIndex,
  onClose,
  restoreFocusTo,
}: {
  images: readonly GalleryImageData[];
  initialIndex: number;
  onClose: () => void;
  restoreFocusTo?: HTMLElement | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const backdropStart = useRef(false);
  const [selected, setSelected] = useState(initialIndex);
  const titleId = useId();
  const captionId = useId();
  const index = images.length
    ? ((selected % images.length) + images.length) % images.length
    : 0;
  const image = images[index];
  const move = (direction: number) => setSelected(index + direction);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const document = dialog.ownerDocument;
    const opener = restoreFocusTo ?? document.activeElement;
    const release = lockLightboxScroll(document);
    try {
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } catch (error) {
      release();
      throw error;
    }
    return () => {
      if (dialog.open) dialog.close();
      release();
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !document.querySelector("dialog[open]")
      ) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [restoreFocusTo]);

  const outside = (event: PointerEvent<HTMLDialogElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  };

  if (!image) return null;
  return (
    <dialog
      ref={dialogRef}
      data-serambi-lightbox
      className={`${serambiTheme} ${styles.lightbox}`}
      aria-labelledby={titleId}
      aria-describedby={image.caption ? captionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        // Ignore a queued close from Strict Mode's cleanup after the dialog reopens.
        if (!event.currentTarget.open) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const controls =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            );
          const first = controls[0];
          const last = controls[controls.length - 1];
          const active = event.currentTarget.ownerDocument.activeElement;
          if (event.shiftKey && active === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first?.focus();
          }
          return;
        }
        if (event.altKey || event.ctrlKey || event.metaKey || images.length < 2)
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onPointerDown={(event) => {
        backdropStart.current =
          event.target === event.currentTarget && outside(event);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && backdropStart.current)
          onClose();
        backdropStart.current = false;
      }}
    >
      <div className={styles.viewerLayout}>
        <header className={styles.viewerHeader}>
          <div>
            <h2 id={titleId} className={styles.viewerTitle}>
              Galeri Foto
            </h2>
            <p
              className={styles.viewerCount}
              aria-live="polite"
              aria-atomic="true"
            >
              Foto {index + 1} dari {images.length}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.viewerControl}
            onClick={onClose}
            aria-label="Tutup galeri foto"
          >
            <X size={20} aria-hidden="true" /> Tutup
          </button>
        </header>
        <div
          className={styles.viewerStage}
          onPointerDown={(event) => {
            if (!event.isPrimary) {
              swipe.current = null;
              return;
            }
            if (event.pointerType !== "touch" && event.pointerType !== "pen")
              return;
            swipe.current = {
              x: event.clientX,
              y: event.clientY,
              id: event.pointerId,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || start.id !== event.pointerId || images.length < 2)
              return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5)
              move(dx < 0 ? 1 : -1);
          }}
        >
          <GalleryMedia key={image.url} image={image} index={index} eager />
        </div>
        {image.caption ? (
          <p id={captionId} dir="auto" className={styles.viewerCaption}>
            {image.caption}
          </p>
        ) : null}
        <nav className={styles.viewerNavigation} aria-label="Navigasi foto">
          <button
            type="button"
            className={styles.viewerControl}
            onClick={() => move(-1)}
            disabled={images.length < 2}
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft size={20} aria-hidden="true" /> Sebelumnya
          </button>
          <button
            type="button"
            className={styles.viewerControl}
            onClick={() => move(1)}
            disabled={images.length < 2}
            aria-label="Foto berikutnya"
          >
            Berikutnya <ChevronRight size={20} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </dialog>
  );
}
