"use client";

import { useState } from "react";
import type { SectionRenderProps } from "./types";
import { CornerFloral, TopGarland } from "./ornaments";

type CoverProps = {
  names?: string;
  tagline?: string;
  note?: string;
  button_label?: string;
  background_image?: string;
  s_overlay?: string;
  s_align?: string;
};

function useOpen() {
  const [open, setOpen] = useState(false);
  return {
    open,
    reveal: () => {
      setOpen(true);
      window.dispatchEvent(new Event("ngaturi:open"));
    },
  };
}

/** Shared shell: fixed overlay on the real page, inline block in the builder. */
function CoverShell({
  inCanvas,
  open,
  children,
  bg,
}: {
  inCanvas?: boolean;
  open: boolean;
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <div
      data-invitation-cover={inCanvas ? undefined : true}
      data-open={open ? "1" : "0"}
      hidden={!inCanvas && open}
      className={
        inCanvas
          ? "relative flex min-h-[78%] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-white"
          : "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center text-white"
      }
      style={{ backgroundColor: bg ?? "var(--inv-primary)" }}
    >
      {inCanvas ? (
        <span className="absolute top-1 left-1 z-20 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
          Sampul
        </span>
      ) : null}
      {children}
    </div>
  );
}

function Photo({ src, opacity }: { src?: string; opacity: number }) {
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

const overlayVal = (s?: string) =>
  s === "light" ? 0.3 : s === "dark" ? 0.68 : 0.5;

function Body({
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

function OpenButton({
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

/* 1. Classic — solid colour / photo, centred */
export function CoverClassic({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open}>
      <Photo src={p.background_image} opacity={overlayVal(p.s_overlay)} />
      <Body p={p} guestName={guestName} />
      <OpenButton label={p.button_label} onClick={reveal} />
    </CoverShell>
  );
}

/* 2. Photo Fullscreen — text pinned to a position */
export function CoverPhoto({ props, guestName, inCanvas }: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  const align =
    p.s_align === "top"
      ? "justify-start pt-24"
      : p.s_align === "bottom"
        ? "justify-end pb-24"
        : "justify-center";
  return (
    <div
      data-invitation-cover={inCanvas ? undefined : true}
      data-open={open ? "1" : "0"}
      hidden={!inCanvas && open}
      className={`${
        inCanvas
          ? "relative min-h-[78%]"
          : "fixed inset-0 z-50"
      } flex flex-col items-center ${align} overflow-hidden px-6 text-center text-white`}
      style={{ backgroundColor: "var(--inv-primary)" }}
    >
      <Photo src={p.background_image} opacity={overlayVal(p.s_overlay)} />
      {inCanvas ? (
        <span className="absolute top-1 left-1 z-20 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
          Sampul
        </span>
      ) : null}
      <Body p={p} guestName={guestName} />
      <OpenButton label={p.button_label} onClick={reveal} />
    </div>
  );
}

/* 3. Botanical — ornaments + framed photo */
export function CoverBotanical({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-primary)">
      <TopGarland className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full text-[var(--inv-secondary)] opacity-70" />
      <CornerFloral className="inv-ornament inv-ornament--slow pointer-events-none absolute -bottom-6 -left-8 h-48 w-48 text-[var(--inv-secondary)] opacity-80" />
      <CornerFloral className="inv-ornament inv-ornament--flip pointer-events-none absolute -right-8 -bottom-6 h-48 w-48 text-[var(--inv-secondary)] opacity-80" />
      {p.background_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.background_image}
          alt=""
          className="relative mb-6 h-56 w-44 rounded-full border-4 border-white/60 object-cover"
        />
      ) : null}
      <Body p={p} guestName={guestName} />
      <OpenButton label={p.button_label} onClick={reveal} />
    </CoverShell>
  );
}

/* 4. Minimal — typographic, no photo */
export function CoverMinimal({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const { open, reveal } = useOpen();
  return (
    <CoverShell inCanvas={inCanvas} open={open} bg="var(--inv-bg)">
      <div className="relative text-[var(--inv-primary)]">
        <p className="text-xs tracking-[0.4em] uppercase">
          {p.tagline ?? "The Wedding Of"}
        </p>
        <h1 className="mt-4 font-[family-name:var(--inv-font)] text-6xl leading-none">
          {p.names ?? "Nama Mempelai"}
        </h1>
        <p className="mt-8 text-sm text-[var(--inv-ink)]">
          {p.note ?? "Kepada Bapak/Ibu/Saudara/i"}
        </p>
        {guestName ? (
          <p className="mt-1 text-lg font-medium text-[var(--inv-ink)]">
            {guestName}
          </p>
        ) : null}
        <button
          onClick={reveal}
          className="mt-10 rounded-full bg-[var(--inv-primary)] px-6 py-2.5 text-sm text-white"
        >
          {p.button_label ?? "Buka Undangan"}
        </button>
      </div>
    </CoverShell>
  );
}
