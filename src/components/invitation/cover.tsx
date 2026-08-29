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

  return (
    <div
      hidden={open}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white"
      style={{ backgroundColor: global.color_primary }}
    >
      <p className="text-sm tracking-[0.3em] uppercase opacity-80">
        The Wedding Of
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-4xl sm:text-5xl">
        {names}
      </h1>
      {guestName ? (
        <div className="mt-8">
          <p className="text-sm opacity-70">Kepada Yth.</p>
          <p className="text-lg">{guestName}</p>
        </div>
      ) : null}
      <button
        onClick={() => setOpen(true)}
        className="mt-10 rounded-full border border-white/60 px-6 py-2.5 text-sm hover:bg-white/10"
      >
        Buka Undangan
      </button>
    </div>
  );
}
