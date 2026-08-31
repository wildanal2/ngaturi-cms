"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorOrnaments, DecorDivider } from "../shared";

type Img = { url: string; caption?: string };

/** 3-column grid; tap a photo to open it fullscreen.
 *  Supports background texture, layered ornaments, and optional section icon. */
export function GallerySpotlight({ props }: SectionRenderProps) {
  const p = props as {
    images?: Img[];
    section_icon?: string;
    background_image?: string;
    ornament_tr_images?: string[];
    ornament_bl_images?: string[];
    divider_image?: string;
  };
  const d = pickDecor(p);
  const images = p.images ?? [];
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section
      className="relative overflow-hidden px-6 py-16 text-center"
      style={decorBgStyle(d)}
    >
      <DecorOrnaments d={d} />
      <div className="relative">
        <div className="flex flex-col items-center">
          {d.section_icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.section_icon} alt="" className="h-9 w-9" />
          ) : null}
          <p className="mt-2 text-[var(--inv-ink)]">Gallery</p>
          <p className="mt-1 text-sm text-[var(--inv-ink)] opacity-80">
            Gallery foto kami bersama
          </p>
        </div>
        <DecorDivider d={d} />

        <div className="mt-6 grid grid-cols-3 gap-2 inv-stagger">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className="aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={img.url}
                alt={img.caption ?? ""}
                width={300}
                height={300}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      {active !== null && images[active] ? (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
          <Image
            src={images[active].url}
            alt={images[active].caption ?? ""}
            width={1200}
            height={1600}
            className="max-h-[85vh] w-auto rounded-lg object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
