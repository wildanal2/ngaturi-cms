"use client";

import { useState } from "react";

export type CoverProps = {
  names?: string;
  tagline?: string;
  note?: string;
  button_label?: string;
  background_image?: string;
  s_overlay?: string;
  s_align?: string;
};

export function useOpen() {
  const [open, setOpen] = useState(false);
  return {
    open,
    reveal: () => {
      setOpen(true);
      window.dispatchEvent(new Event("ngaturi:open"));
    },
  };
}

/** Shared shell: fixed full-height overlay on the real page, inline block
 *  in the builder. Scrolls internally if content is taller than the screen. */
export function CoverShell({
  inCanvas,
  open,
  children,
  bg,
  align = "center",
}: {
  inCanvas?: boolean;
  open: boolean;
  children: React.ReactNode;
  bg?: string;
  align?: "top" | "center" | "bottom";
}) {
  const justify =
    align === "top"
      ? "justify-start pt-20"
      : align === "bottom"
        ? "justify-end pb-20"
        : "justify-center";
  return (
    <div
      data-invitation-cover={inCanvas ? undefined : true}
      data-open={open ? "1" : "0"}
      hidden={!inCanvas && open}
      className={
        inCanvas
          ? "relative min-h-[600px] w-full overflow-hidden"
          : "fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      }
      style={{ backgroundColor: bg ?? "var(--inv-primary)" }}
    >
      <div
        className={`relative flex ${
          inCanvas ? "min-h-[600px]" : "min-h-dvh"
        } flex-col items-center ${justify} px-6 py-16 text-center text-white`}
      >
        {inCanvas ? (
          <span className="absolute top-1 left-1 z-20 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
            Sampul
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Photo({ src, opacity }: { src?: string; opacity: number }) {
  if (!src) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black" style={{ opacity }} />
    </>
  );
}

export const overlayVal = (s?: string) =>
  s === "light" ? 0.3 : s === "dark" ? 0.68 : 0.5;

export function Body({
  p,
  guestName,
}: {
  p: CoverProps;
  guestName?: string | null;
}) {
  return (
    <div className="relative">
      <p className="text-xs tracking-[0.35em] uppercase opacity-85">
        {p.tagline ?? "The Wedding Of"}
      </p>
      <h1 className="mt-3 font-[family-name:var(--inv-font)] text-4xl sm:text-5xl">
        {p.names ?? "Nama Mempelai"}
      </h1>
      <div className="mt-8">
        <p className="text-sm opacity-75">
          {p.note ?? "Kepada Bapak/Ibu/Saudara/i"}
        </p>
        {guestName ? (
          <p className="mt-1 text-lg font-medium">{guestName}</p>
        ) : null}
      </div>
    </div>
  );
}

export function OpenButton({
  label,
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative mt-10 rounded-full border border-white/60 px-6 py-2.5 text-sm hover:bg-white/10"
    >
      {label ?? "Buka Undangan"}
    </button>
  );
}
