"use client";

import type { SectionRenderProps } from "../types";
import { Divider, FloatingLeaves } from "../ornaments";
import { CoverShell, useOpen, type CoverProps } from "./shell";

/**
 * "Floating" wedding cover — swaying botanical corners, stacked
 * handwritten names, sage labels, gold pill button.
 */
export function CoverFloating({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  const [first, second] = (p.names ?? "Nama & Pasangan")
    .split(/\s*&\s*/)
    .map((s) => s.trim());

  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-bg)">
      <FloatingLeaves />
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

        <Divider className="mt-6 h-4 w-40 text-[var(--inv-secondary)] opacity-70" />

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
