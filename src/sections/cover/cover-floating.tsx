"use client";

import type { SectionRenderProps } from "../types";
import { Divider, DividerImage, FloatingLeaves, FloatingLeavesImage } from "../ornaments";
import { CoverShell, useOpen } from "./shell";

type FloatingCoverProps = {
  names?: string;
  tagline?: string;
  note?: string;
  button_label?: string;
  background_image?: string;
  ornament_tr_images?: string[];
  ornament_bl_images?: string[];
  divider_image?: string;
};

/**
 * "Floating" wedding cover — swaying botanical corners, stacked
 * handwritten names, sage labels, gold pill button.
 *
 * When `ornament_tr_images` / `ornament_bl_images` are set (3 PNGs each),
 * renders the real layered leaf images from undangan_1 instead of SVG.
 */
export function CoverFloating({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as FloatingCoverProps;
  const { open, reveal } = useOpen();
  const [first, second] = (p.names ?? "Nama & Pasangan")
    .split(/\s*&\s*/)
    .map((s) => s.trim());

  const hasImageOrnaments =
    p.ornament_tr_images?.length && p.ornament_bl_images?.length;

  const bgStyle: React.CSSProperties = p.background_image
    ? {
        backgroundImage: `url('${p.background_image}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "var(--inv-bg)",
      }
    : {};

  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-bg)" style={bgStyle}>
      {hasImageOrnaments ? (
        <FloatingLeavesImage
          trImages={p.ornament_tr_images!}
          blImages={p.ornament_bl_images!}
        />
      ) : (
        <FloatingLeaves />
      )}
      <div className="relative flex flex-col items-center text-[var(--inv-primary)]">
        <p className="text-sm font-medium tracking-[0.3em] uppercase text-[var(--inv-secondary)]">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-8 font-[family-name:var(--inv-font)] text-5xl leading-[1.15] sm:text-6xl">
          {first}
        </h1>
        {second ? (
          <>
            <span className="my-1 font-[family-name:var(--inv-font)] text-4xl">
              &amp;
            </span>
            <h1 className="font-[family-name:var(--inv-font)] text-5xl leading-[1.15] sm:text-6xl">
              {second}
            </h1>
          </>
        ) : null}

        {p.divider_image ? (
          <DividerImage src={p.divider_image} className="mt-6 h-4 w-12 object-contain opacity-70" />
        ) : (
          <Divider className="mt-6 h-4 w-40 text-[var(--inv-secondary)] opacity-70" />
        )}

        <p className="mt-8 text-sm text-[var(--inv-secondary)]">
          {p.note ?? "Kepada Yth. Bapak/Ibu/Saudara/i"}
        </p>
        {guestName ? (
          <p className="mt-1 text-lg font-semibold text-[var(--inv-ink)]">
            {guestName}
          </p>
        ) : null}

        <button
          onClick={reveal}
          className="mt-8 rounded-full bg-[var(--inv-primary)] px-7 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          {p.button_label ?? "Buka Undangan"}
        </button>
      </div>
    </CoverShell>
  );
}
