"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import type { z } from "zod";
import type { GalleryProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { HeritageFrame } from "../cinematic/primitives";
import { CinematicDialog } from "../cinematic/dialog";
import { animateCinematicScroll } from "../cinematic/scroll";
import styles from "../cinematic/cinematic.module.css";

type Photo = { url: string; caption?: string };
function MemoryImage({
  photo,
  enlarged = false,
}: {
  photo: Photo;
  enlarged?: boolean;
}) {
  const [state, setState] = useState("loading");
  return (
    <div
      className={enlarged ? styles.lightboxImage : styles.memoryImage}
      aria-busy={state === "loading"}
    >
      {state === "error" ? (
        <span className={styles.memoryFallback} role="status">
          Foto belum dapat dimuat
        </span>
      ) : (
        <>
          {state === "loading" ? (
            <span className={styles.imageLoading} role="status">
              Memuat foto…
            </span>
          ) : null}
          <Image
            src={photo.url}
            alt={photo.caption || "Kenangan bersama"}
            fill
            sizes={enlarged ? "100vw" : "(max-width: 768px) 88vw, 580px"}
            loading="lazy"
            draggable={false}
            className={styles.memoryPhoto}
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />
        </>
      )}
    </div>
  );
}
function useSwipe(onSwipe: (direction: number) => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  return {
    swiped,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        swiped.current = false;
        if (event.pointerType === "touch" || event.pointerType === "pen")
          start.current = {
            x: event.clientX,
            y: event.clientY,
            id: event.pointerId,
          };
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const from = start.current;
        start.current = null;
        if (!from || from.id !== event.pointerId) return;
        const dx = event.clientX - from.x,
          dy = event.clientY - from.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          swiped.current = true;
          event.preventDefault();
          onSwipe(dx < 0 ? 1 : -1);
        }
      },
      onPointerCancel: () => {
        start.current = null;
      },
    },
  };
}
function Lightbox({
  images,
  initialIndex,
  opener,
  onClose,
}: {
  images: Photo[];
  initialIndex: number;
  opener: HTMLElement;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const selected = images.length ? index % images.length : 0;
  const move = (direction: number) =>
    setIndex((value) => (value + direction + images.length) % images.length);
  const { handlers } = useSwipe(move);
  const photo = images[selected];
  if (!photo) return null;
  return (
    <CinematicDialog
      title="Kenangan kami"
      kind="lightbox"
      opener={opener}
      onClose={onClose}
      onKeyDown={(key) => move(key === "ArrowRight" ? 1 : -1)}
    >
      <div className={styles.lightboxStage} {...handlers}>
        <MemoryImage key={photo.url} photo={photo} enlarged />
      </div>
      <div className={styles.galleryControls}>
        <button
          type="button"
          disabled={images.length < 2}
          aria-label="Foto sebelumnya"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        <p role="status" aria-live="polite">
          Foto {selected + 1} dari {images.length}
        </p>
        <button
          type="button"
          disabled={images.length < 2}
          aria-label="Foto berikutnya"
          onClick={() => move(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      {photo.caption ? (
        <p className={styles.lightboxCaption}>{photo.caption}</p>
      ) : null}
    </CinematicDialog>
  );
}

/** Vertical camera travel and deliberate horizontal gestures share one gallery index. */
export function GalleryCinematicVintage({
  props,
  inCanvas,
}: SectionRenderProps) {
  const p = props as Partial<z.infer<typeof GalleryProps>>;
  const images = (p.images ?? []).filter((photo) => photo.url?.trim());
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<{
    index: number;
    opener: HTMLElement;
  } | null>(null);
  useEffect(() => {
    const gallery = root.current;
    if (!gallery) return;
    const update = () => {
      const value = Number(gallery.dataset.activeGalleryIndex);
      if (Number.isFinite(value)) setIndex(value);
    };
    const observer = new MutationObserver(update);
    observer.observe(gallery, {
      attributes: true,
      attributeFilter: ["data-active-gallery-index"],
    });
    const owner = inCanvas
      ? gallery.closest<HTMLElement>("[data-device-scroller]")
      : null;
    const panels = [
      ...gallery.querySelectorAll<HTMLElement>("[data-gallery-index]"),
    ];
    const visibility = new IntersectionObserver(
      () => {
        if (gallery.closest("[data-enhanced]:not([data-linear])")) return;
        const top = owner?.getBoundingClientRect().top ?? 0;
        const height = owner?.clientHeight ?? window.innerHeight;
        const visible = panels.filter((panel) => {
          const box = panel.getBoundingClientRect();
          return box.top < top + height && box.bottom > top;
        });
        const panel = visible.sort(
          (a, b) =>
            Math.abs(a.getBoundingClientRect().top - top - height * 0.2) -
            Math.abs(b.getBoundingClientRect().top - top - height * 0.2),
        )[0];
        if (panel) setIndex(Number(panel.dataset.galleryIndex));
      },
      { root: owner, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    panels.forEach((panel) => visibility.observe(panel));
    return () => {
      observer.disconnect();
      visibility.disconnect();
    };
  }, [inCanvas, images.length]);
  const go = (next: number) => {
    next = Math.max(0, Math.min(images.length - 1, next));
    const gallery = root.current,
      section = gallery?.closest<HTMLElement>("[data-section-id]");
    if (!gallery || !section) return;
    const stage = section.closest("[data-cinematic-stage]");
    const event = new CustomEvent("cinematic:seek", {
      detail: {
        sectionId: section.dataset.sectionId,
        panelIndex: next,
        behavior: "smooth",
      },
      cancelable: true,
    });
    if (!stage || stage.dispatchEvent(event)) {
      const target =
        gallery.querySelectorAll<HTMLElement>("[data-world-panel]")[next];
      const owner = inCanvas
        ? gallery.closest<HTMLElement>("[data-device-scroller]")
        : null;
      if (!target || (inCanvas && !owner)) return;
      animateCinematicScroll(
        owner ?? window,
        target.getBoundingClientRect().top -
          (owner?.getBoundingClientRect().top ?? 0) +
          (owner?.scrollTop ?? window.scrollY),
        {
          onComplete: () =>
            target
              .querySelector<HTMLElement>("button")
              ?.focus({ preventScroll: true }),
        },
      );
    }
    setIndex(next);
  };
  const { swiped, handlers } = useSwipe((direction) => go(index + direction));
  return (
    <div
      ref={root}
      className={styles.gallery}
      data-gallery-frames
      {...handlers}
    >
      {images.map((photo, i) => (
        <figure
          data-world-panel
          data-gallery-index={i}
          className={styles.galleryPanel}
          key={`${i}:${photo.url}`}
        >
          <HeritageFrame className={styles.galleryFrame}>
            <button
              className={styles.galleryOpen}
              type="button"
              aria-label={`Perbesar foto ${i + 1} dari ${images.length}${photo.caption ? `: ${photo.caption}` : ""}`}
              onClick={(event) => {
                if (!swiped.current)
                  setViewer({ index: i, opener: event.currentTarget });
              }}
            >
              <MemoryImage key={photo.url} photo={photo} />
              <span className={styles.enlargeHint}>
                <Expand size={15} aria-hidden="true" /> Perbesar
              </span>
            </button>
            <figcaption className={styles.galleryCaption}>
              <p className={styles.eyebrow}>Kenangan bersama</p>
              {photo.caption ? <p>{photo.caption}</p> : null}
              <div className={styles.galleryControls}>
                <button
                  type="button"
                  disabled={i === 0}
                  aria-label="Kenangan sebelumnya"
                  onClick={() => go(i - 1)}
                >
                  <ChevronLeft size={19} />
                </button>
                <span>
                  Foto {i + 1} / {images.length}
                </span>
                <button
                  type="button"
                  disabled={i === images.length - 1}
                  aria-label="Kenangan berikutnya"
                  onClick={() => go(i + 1)}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
              {i === 0 ? (
                <p className={styles.galleryHint}>
                  Gulir untuk menjelajah · geser foto atau ketuk untuk perbesar
                </p>
              ) : null}
            </figcaption>
          </HeritageFrame>
        </figure>
      ))}
      {viewer ? (
        <Lightbox
          images={images}
          initialIndex={viewer.index}
          opener={viewer.opener}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </div>
  );
}
