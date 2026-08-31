"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, QrCode } from "lucide-react";

/** Compact share row for a published invitation card: copy link + WhatsApp + QR. */
export function InlineShare({ url, title }: { url: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const waText = encodeURIComponent(
    `Assalamualaikum, dengan hormat kami mengundang Anda${
      title ? ` ke acara ${title}` : ""
    }. Info lengkap & konfirmasi kehadiran: ${url}`,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {}
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-cream-200"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Tersalin" : "Salin tautan"}
      </button>
      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:brightness-95"
      >
        <MessageCircle size={13} /> WhatsApp
      </a>
      <a
        href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          url,
        )}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-cream-200"
      >
        <QrCode size={13} /> QR
      </a>
    </div>
  );
}
