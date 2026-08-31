"use client";

import type { SectionRenderProps } from "../types";
import { WaxSeal } from "../ornaments";
import { CoverShell, useOpen, type CoverProps } from "./shell";

type WaxProps = CoverProps & {
  seal_label?: string;
  accent_color?: string;
  envelope_color?: string;
};

/**
 * Navy fabric envelope with a diagonal fold and a wax seal to press open.
 * The envelope look is pure CSS — no image assets.
 */
export function CoverWaxSeal({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as WaxProps;
  const { open, reveal } = useOpen();

  const accent = p.accent_color || "#c8a15e";
  const envelope = p.envelope_color || "#182742";
  const names = (p.names ?? "Nama & Pasangan").split(/\s*&\s*/).map((x) => x.trim());
  const initials = names.map((n) => n[0] ?? "").join("");

  return (
    <CoverShell inCanvas={inCanvas} open={open} bg={envelope}>
      {/* woven-fabric texture via layered gradients */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,.05) 0 2px, transparent 2px 4px)`,
        }}
      />
      {/* vignette */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 32%, rgba(0,0,0,0.34) 100%)",
        }}
      />
      {/* diagonal envelope fold */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[58%]"
        style={{
          background: `linear-gradient(165deg, rgba(255,255,255,.14) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,.26) 100%), ${envelope}`,
          clipPath: "polygon(0 0, 0 100%, 100% 50%)",
        }}
      />

      <div className="relative flex flex-col items-center" style={{ color: accent }}>
        <p className="text-[10px] uppercase tracking-[0.4em]">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-4 font-[family-name:var(--inv-font)] text-4xl font-semibold leading-tight">
          {names[0]}
          {names[1] ? (
            <>
              <span className="italic"> &amp;</span>
              <br />
              {names[1]}
            </>
          ) : null}
        </h1>
        <p className="mt-8 text-[9px] uppercase tracking-[0.25em]">
          {p.note ?? "Kepada Yth. Bapak/Ibu/Saudara/i"}
        </p>
        {guestName ? (
          <p className="mt-1 font-[family-name:var(--inv-font)] text-lg font-semibold">
            {guestName}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reveal}
          aria-label={p.seal_label ?? "Klik segel untuk membuka"}
          className="mt-10 h-24 w-24 transition-transform duration-300 hover:scale-105"
        >
          <span className="inv-ornament inv-ornament--drift block h-full w-full text-[#9c2b2b] drop-shadow-[0_10px_22px_rgba(0,0,0,0.45)]">
            <WaxSeal className="h-full w-full" initials={initials} />
          </span>
        </button>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.3em]">
          {p.seal_label ?? "Klik segel untuk membuka"}
        </p>
      </div>
    </CoverShell>
  );
}
