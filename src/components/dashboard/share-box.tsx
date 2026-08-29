"use client";

import { useState } from "react";

export function ShareBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const waText = encodeURIComponent(
    `Dengan hormat kami mengundang Anda. Info lengkap & konfirmasi kehadiran: ${url}`,
  );

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-sm font-medium">Bagikan undangan</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded-lg bg-cream-200 px-3 py-1.5 text-sm">
          {url}
        </code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-cream-200"
        >
          {copied ? "Tersalin" : "Salin"}
        </button>
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-forest px-3 py-1.5 text-sm font-medium text-cream"
        >
          Bagikan ke WhatsApp
        </a>
        <a
          href={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-cream-200"
        >
          QR code
        </a>
      </div>
    </div>
  );
}
