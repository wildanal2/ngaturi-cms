"use client";

import { useState } from "react";

export function CopyChip({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="w-full rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
    >
      {done ? "Tersalin" : "Salin URL"}
    </button>
  );
}
