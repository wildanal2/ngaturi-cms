"use client";

import { useState } from "react";
import type { GlobalSettings } from "@/sections/types";

export function InvitationCover({
  names,
  guestName,
  global,
}: {
  names: string;
  guestName: string | null;
  global: GlobalSettings;
}) {
  const [open, setOpen] = useState(false);

  if (global.cover_enabled === false) return null;

  const tagline = global.cover_tagline ?? "The Wedding Of";
  const note =
    global.cover_note ??
    "Kepada Bapak/Ibu/Saudara/i";
  const buttonLabel = global.cover_button ?? "Buka Undangan";
  const bgImage = global.cover_image;

  return (
    <div
      data-invitation-cover
      data-open={open ? "1" : "0"}
      hidden={open}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center text-white"
      style={{ backgroundColor: global.color_primary }}
    >
      {bgImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      ) : null}

      <div className="relative">
        <p className="text-sm tracking-[0.3em] uppercase opacity-80">
          {tagline}
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-4xl sm:text-5xl">
          {names}
        </h1>
        <div className="mt-8">
          <p className="text-sm opacity-70">{note}</p>
          {guestName ? (
            <p className="mt-1 text-lg font-medium">{guestName}</p>
          ) : null}
        </div>
        <button
          onClick={() => {
            setOpen(true);
            window.dispatchEvent(new Event("ngaturi:open"));
          }}
          className="mt-10 rounded-full border border-white/60 px-6 py-2.5 text-sm hover:bg-white/10"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
