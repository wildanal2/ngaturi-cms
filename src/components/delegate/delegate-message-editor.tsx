"use client";

import { useRef, useState } from "react";
import {
  renderWhatsappMessage,
  validateWhatsappMessage,
  WHATSAPP_MESSAGE_MAX_LENGTH,
  WHATSAPP_PLACEHOLDERS,
} from "@/lib/invitation/whatsapp-message";

/**
 * Session-only message draft for the customer. Nothing is sent to the server
 * and the reseller's saved template is never touched; the parent keeps the
 * draft in state and uses it for "Kirim WA".
 */
export function DelegateMessageEditor({
  base,
  draft,
  onChange,
  coupleNames,
  sampleName,
  sampleLink,
}: {
  base: string;
  draft: string;
  onChange: (message: string) => void;
  coupleNames: string;
  sampleName: string;
  sampleLink: string;
}) {
  const [open, setOpen] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const error = validateWhatsappMessage(draft);
  const changed = draft !== base;

  function insert(placeholder: string) {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + placeholder + draft.slice(end);
    if (next.length > WHATSAPP_MESSAGE_MAX_LENGTH) return;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const at = start + placeholder.length;
      el.setSelectionRange(at, at);
    });
  }

  return (
    <section
      aria-labelledby="delegate-wa-title"
      className="rounded-xl border border-line bg-paper"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="delegate-wa-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span id="delegate-wa-title" className="font-medium">
          Edit Pesan WhatsApp
        </span>
        <span
          className={`rounded-full px-3 py-0.5 text-xs ${changed ? "bg-gold/20 text-ink" : "bg-forest/5 text-forest"}`}
        >
          {changed ? "Pesan diubah" : "Pesan bawaan"}
        </span>
      </button>
      {open ? (
        <div id="delegate-wa-panel" className="space-y-3 px-4 pb-4">
          <p className="text-xs text-ink-soft">
            Perubahan hanya dipakai untuk pengiriman dari halaman ini dan hilang
            saat halaman dimuat ulang. Pesan milik pembuat undangan tidak
            berubah.
          </p>
          <label
            htmlFor="delegate-wa-text"
            className="block text-sm font-medium"
          >
            Isi pesan
          </label>
          <textarea
            ref={textarea}
            id="delegate-wa-text"
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            maxLength={WHATSAPP_MESSAGE_MAX_LENGTH}
            rows={8}
            aria-invalid={!!error}
            aria-describedby="delegate-wa-hint"
            // 16px on phones stops iOS Safari from zooming the page on focus.
            className="w-full rounded-lg border border-line px-3 py-2 text-base sm:text-sm"
          />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
            <p id="delegate-wa-hint">
              Variabel diganti otomatis untuk setiap tamu. Tautan personal wajib
              ada.
            </p>
            <span>
              {draft.length}/{WHATSAPP_MESSAGE_MAX_LENGTH} karakter
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {WHATSAPP_PLACEHOLDERS.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                onClick={() => insert(placeholder)}
                className="rounded-full border border-line px-3 py-2 text-xs"
              >
                {placeholder}
              </button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-wine">
              {error} Tombol Kirim WA dinonaktifkan sampai pesan diperbaiki.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!changed}
            onClick={() => onChange(base)}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
          >
            Reset ke pesan bawaan
          </button>
          <div className="space-y-2 rounded-lg border border-line bg-cream/40 p-3">
            <h3 className="text-sm font-medium">Preview Pesan</h3>
            <p className="text-xs text-muted">
              Contoh untuk {sampleName}. Tidak mengirim pesan WhatsApp.
            </p>
            <p
              data-testid="delegate-wa-preview"
              className="whitespace-pre-wrap break-words text-sm"
            >
              {error
                ? "Pesan belum valid."
                : renderWhatsappMessage(
                    draft,
                    sampleName,
                    sampleLink,
                    coupleNames,
                  )}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
