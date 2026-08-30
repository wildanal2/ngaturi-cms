"use client";

import { useEffect, useRef, useState } from "react";
import { getVariant, variantDefaultProps } from "@/sections/registry";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import { useBuilder } from "@/stores/builder-store";

const BASE_WIDTH = 390; // mobile canvas width the components are designed for
const MAX_H = 260; // tallest a thumbnail may get

/** demo props so a variant renders something in the picker even when it
 *  needs data the user provides later (music track, etc.) */
function thumbProps(type: string, variantKey: string): Record<string, unknown> {
  const base = variantDefaultProps(type, variantKey);
  if (type === "music") {
    return {
      ...base,
      audio_url: "about:blank",
      track_title: "Lagu Contoh",
      track_artist: "Ngaturi",
    };
  }
  return base;
}

/**
 * Live miniature render of a section variant, scaled so the WHOLE
 * component fits the card (fit-to-width for short sections, fit-to-height
 * for full-height ones like the cover). Shown in the "Tampilan" picker.
 */
export function VariantThumb({
  type,
  variantKey,
}: {
  type: string;
  variantKey: string;
}) {
  const global = useBuilder((s) => s.global);
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [{ cardW, natH }, setDims] = useState({ cardW: 0, natH: 0 });

  useEffect(() => {
    const card = cardRef.current;
    const inner = innerRef.current;
    if (!card || !inner) return;
    const update = () =>
      setDims({ cardW: card.clientWidth, natH: inner.scrollHeight });
    const ro = new ResizeObserver(update);
    ro.observe(card);
    ro.observe(inner);
    update();
    return () => ro.disconnect();
  }, []);

  const v = getVariant(type, variantKey);
  if (!v) return null;
  const Component = v.component;

  const scale =
    cardW && natH
      ? Math.min(cardW / BASE_WIDTH, MAX_H / natH)
      : cardW
        ? cardW / BASE_WIDTH
        : 0.3;
  const height = natH ? Math.min(natH * scale, MAX_H) : 110;

  return (
    <div
      ref={cardRef}
      className="relative flex w-full justify-center overflow-hidden border-b border-line bg-white"
      style={{ height }}
    >
      <div
        ref={innerRef}
        className="pointer-events-none origin-top shrink-0 self-start"
        style={{
          ...invitationRootStyle(global),
          width: BASE_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        <Component
          props={thumbProps(type, variantKey)}
          global={global}
          isPreview
          inCanvas
          siblingTypes={[]}
        />
      </div>
    </div>
  );
}
