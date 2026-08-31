"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorDivider, DecorOrnaments } from "../shared";
import styles from "../floating17.module.css";

type GalleryImage = { url: string; caption?: string };

export function GalleryFloating17({ props }: SectionRenderProps) {
  const p = props as Record<string, unknown> & { images?: GalleryImage[] };
  const d = pickDecor(p);
  const images = p.images ?? [];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const startX = useRef<number | null>(null);
  const go = (delta: number) =>
    setActive((n) =>
      images.length ? (n + delta + images.length) % images.length : 0,
    );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const delta = e.key === "ArrowLeft" ? -1 : 1;
        setActive((n) =>
          images.length ? (n + delta + images.length) % images.length : 0,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  return (
    <section className={`${styles.bodyFont} relative overflow-hidden px-4 py-20 text-center`} style={decorBgStyle(d)}>
      <DecorOrnaments d={d} />
      <div className="relative z-10 mx-auto max-w-lg">
        {d.section_icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.section_icon} alt="" className="mx-auto h-10 w-10" />
        ) : null}
        <h2 className="mt-2 text-sm uppercase tracking-[0.28em] text-[#3A443D]">Galeri</h2>
        <p className="mt-2 text-xs text-[#707070]">Gallery foto kami bersama</p>
        <DecorDivider d={d} className="mx-auto mt-4 h-4 w-24 object-contain" />

        <div
          className={`${styles.carouselStage} mt-8`}
          onPointerDown={(e) => { startX.current = e.clientX; }}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const distance = e.clientX - startX.current;
            if (Math.abs(distance) > 45) go(distance > 0 ? -1 : 1);
            startX.current = null;
          }}
          onPointerCancel={() => { startX.current = null; }}
        >
          {images.map((image, i) => {
            let offset = i - active;
            if (offset > images.length / 2) offset -= images.length;
            if (offset < -images.length / 2) offset += images.length;
            const visible = Math.abs(offset) <= 2;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Buka foto ${i + 1}`}
                aria-hidden={!visible}
                tabIndex={visible ? 0 : -1}
                onClick={() => offset === 0 ? setLightbox(i) : setActive(i)}
                className={styles.carouselSlide}
                style={{
                  opacity: visible ? Math.abs(offset) === 2 ? 0.25 : 1 : 0,
                  filter: offset === 0 ? "none" : "saturate(.72) brightness(.88)",
                  zIndex: 10 - Math.abs(offset),
                  transform: `translateX(calc(-50% + ${offset * 58}%)) translateZ(${-Math.abs(offset) * 110}px) rotateY(${offset * -18}deg) scale(${offset === 0 ? 1 : 0.82})`,
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                <Image src={image.url} alt={image.caption ?? ""} fill sizes="(max-width: 640px) 66vw, 260px" priority={i === 0} />
              </button>
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-center gap-4">
          <button type="button" onClick={() => go(-1)} aria-label="Foto sebelumnya" className="grid h-9 w-9 place-items-center rounded-full bg-[#668A5E] text-white shadow">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-12 text-xs text-[#707070]">{images.length ? active + 1 : 0} / {images.length}</span>
          <button type="button" onClick={() => go(1)} aria-label="Foto berikutnya" className="grid h-9 w-9 place-items-center rounded-full bg-[#668A5E] text-white shadow">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {lightbox !== null && images[lightbox] ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-5" onClick={() => setLightbox(null)}>
          <button type="button" aria-label="Tutup galeri" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"><X size={20} /></button>
          <Image src={images[lightbox].url} alt={images[lightbox].caption ?? ""} width={900} height={1300} className="max-h-[88vh] w-auto rounded-xl object-contain" />
        </div>
      ) : null}
    </section>
  );
}
