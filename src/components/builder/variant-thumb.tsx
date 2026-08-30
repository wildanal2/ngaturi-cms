"use client";

import { useEffect, useRef, useState } from "react";
import { getVariant, variantDefaultProps } from "@/sections/registry";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import { useBuilder } from "@/stores/builder-store";

const BASE_WIDTH = 390; // mobile canvas width the components are designed for
const VIEWPORT_H = 300; // how much vertical content to show in the thumb

/**
 * Live miniature render of a section variant, scaled so the FULL component
 * width fits the card. Shown in the "Tampilan" picker.
 */
export function VariantThumb({
  type,
  variantKey,
}: {
  type: string;
  variantKey: string;
}) {
  const global = useBuilder((s) => s.global);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      if (w > 0) setScale(w / BASE_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const v = getVariant(type, variantKey);
  if (!v) return null;
  const Component = v.component;

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden border-b border-line bg-white"
      style={{ height: VIEWPORT_H * scale }}
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{
          ...invitationRootStyle(global),
          width: BASE_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        <Component
          props={variantDefaultProps(type, variantKey)}
          global={global}
          isPreview
          inCanvas
          siblingTypes={[]}
        />
      </div>
    </div>
  );
}
