"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { lockLightboxScroll } from "../serambi-delima/lightbox-scroll";
import { cancelCinematicScroll } from "../cinematic/scroll";
import { imageUrl, records, text } from "./data";
import { Entrance } from "./presentation";
import { Photo, Section } from "./primitives";
import styles from "./lakon-kencana.module.css";

type Image = { url: string; full: string; caption: string };
export function GalleryLakon({ props }: SectionRenderProps) {
  const images: Image[] = records(props.images).flatMap((i) => {
    const url = imageUrl(i.url);
    return url
      ? [{ url, full: imageUrl(i.full_url) || url, caption: text(i.caption) }]
      : [];
  });
  const [selected, setSelected] = useState(0);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const length = images.length;
  const index = length ? ((selected % length) + length) % length : 0;
  const move = (direction: number) =>
    setSelected((index + direction + length) % length);
  if (!length) return null;
  return (
    <Section
      type="gallery"
      title={text(props.title, "Simpingan Kenangan")}
      eyebrow={text(props.eyebrow, "POTRET KEBERSAMAAN")}
      intro={text(props.intro)}
      className={styles.gallerySection}
    >
      <div
        className={styles.gallery}
        role="region"
        aria-roledescription="carousel"
        aria-label="Galeri foto"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div
          className={styles.fan}
          onPointerDown={(e) => {
            if (!e.isPrimary) return;
            touch.current = { x: e.clientX, y: e.clientY };
            moved.current = false;
          }}
          onPointerCancel={() => {
            touch.current = null;
          }}
          onPointerUp={(e) => {
            const from = touch.current;
            touch.current = null;
            if (!from) return;
            const dx = e.clientX - from.x,
              dy = e.clientY - from.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              moved.current = true;
              move(dx < 0 ? 1 : -1);
            }
          }}
        >
          {images.map((img, i) => {
            let offset = (i - index + length) % length;
            if (offset > length / 2) offset -= length;
            const distance = Math.abs(offset);
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                className={styles.fanPhoto}
                data-active={i === index || undefined}
                hidden={distance > 2}
                aria-label={
                  i === index ? `Perbesar foto ${i + 1}` : `Pilih foto ${i + 1}`
                }
                aria-current={i === index ? "true" : undefined}
                style={
                  {
                    "--fan-offset": offset,
                    "--fan-distance": distance,
                    zIndex: 10 - distance,
                  } as CSSProperties
                }
                onClick={(e) => {
                  if (moved.current) {
                    moved.current = false;
                    return;
                  }
                  if (i === index) {
                    setOpener(e.currentTarget);
                  } else setSelected(i);
                }}
              >
                <Entrance
                  className={styles.fanEntrance}
                  delay={Math.min(i, 2) * 90}
                >
                  <Photo
                    src={img.url}
                    alt={img.caption || `Kenangan ${i + 1}`}
                  />
                </Entrance>
                {i === index && (
                  <span className={styles.expand}>
                    <Expand size={16} aria-hidden="true" /> Perbesar
                  </span>
                )}
              </button>
            );
          })}
          <div className={styles.fanBase} aria-hidden="true" />
        </div>
        <div className={styles.galleryControls}>
          <button
            type="button"
            className={styles.roundButton}
            onClick={() => move(-1)}
            disabled={length < 2}
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft size={21} />
          </button>
          <div className={styles.dots}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Foto ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setSelected(i)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.roundButton}
            onClick={() => move(1)}
            disabled={length < 2}
            aria-label="Foto berikutnya"
          >
            <ChevronRight size={21} />
          </button>
        </div>
        <p className={styles.galleryHint} aria-live="polite">
          Foto {index + 1} dari {length}
          {images[index].caption ? ` · ${images[index].caption}` : ""}
        </p>
        <p className={styles.small}>
          Geser atau ketuk foto samping. Ketuk foto utama untuk memperbesar.
        </p>
      </div>
      {opener && (
        <Lightbox
          images={images}
          index={index}
          move={move}
          onClose={() => setOpener(null)}
          opener={opener}
        />
      )}
    </Section>
  );
}
function Lightbox({
  images,
  index,
  move,
  onClose,
  opener,
}: {
  images: Image[];
  index: number;
  move: (d: number) => void;
  onClose: () => void;
  opener: HTMLElement | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const outside = useRef(false);
  const id = useId();
  const image = images[index];
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const scroller = dialog.closest<HTMLElement>("[data-device-scroller]");
    const overflow = scroller?.style.overflow;
    cancelCinematicScroll(scroller ?? window);
    const release = lockLightboxScroll(document);
    if (scroller) scroller.style.overflow = "hidden";
    dialog.showModal();
    close.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      release();
      if (scroller) scroller.style.overflow = overflow ?? "";
      if (opener?.isConnected) {
        const target = opener.getClientRects().length
          ? opener
          : opener
              .closest('[data-lakon-scene="gallery"]')
              ?.querySelector<HTMLElement>("button[data-active]");
        target?.focus({ preventScroll: true });
      }
    };
  }, [opener]);
  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      data-lakon-lightbox
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={(e) => {
        if (!e.currentTarget.open) onClose();
      }}
      onPointerDown={(e) => {
        outside.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && outside.current) onClose();
        outside.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const controls = [
            ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ];
          if (e.shiftKey && document.activeElement === controls[0]) {
            e.preventDefault();
            controls.at(-1)?.focus();
          } else if (
            !e.shiftKey &&
            document.activeElement === controls.at(-1)
          ) {
            e.preventDefault();
            controls[0]?.focus();
          }
        } else if (
          !e.altKey &&
          !e.ctrlKey &&
          !e.metaKey &&
          (e.key === "ArrowLeft" || e.key === "ArrowRight")
        ) {
          e.preventDefault();
          e.stopPropagation();
          move(e.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <header className={styles.viewerHeader}>
        <h2 id={id}>Galeri Kenangan</h2>
        <button
          ref={close}
          type="button"
          className={styles.roundButton}
          onClick={onClose}
          aria-label="Tutup galeri"
        >
          <X size={21} />
        </button>
      </header>
      <div
        className={styles.viewerImage}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.pointerType === "mouse") return;
          swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onPointerUp={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from || from.id !== e.pointerId) return;
          const dx = e.clientX - from.x,
            dy = e.clientY - from.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5)
            move(dx < 0 ? 1 : -1);
        }}
      >
        <Photo
          key={image.full}
          src={image.full}
          alt={image.caption || `Foto ${index + 1}`}
          eager
        />
      </div>
      <p className={styles.viewerCaption} aria-live="polite">
        {index + 1} / {images.length}
        {image.caption ? ` · ${image.caption}` : ""}
      </p>
      <div className={styles.viewerNavigation}>
        <button
          type="button"
          className={styles.button}
          disabled={images.length < 2}
          aria-label="Foto sebelumnya"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} /> Sebelumnya
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={images.length < 2}
          aria-label="Foto berikutnya"
          onClick={() => move(1)}
        >
          Berikutnya <ChevronRight size={18} />
        </button>
      </div>
    </dialog>
  );
}
