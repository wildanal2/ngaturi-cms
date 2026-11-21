"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  resetWhatsappTemplate,
  saveWhatsappTemplate,
} from "@/lib/invitation/whatsapp-message-actions";
import {
  renderWhatsappMessage,
  validateWhatsappMessage,
  WHATSAPP_MESSAGE_MAX_LENGTH,
  WHATSAPP_PLACEHOLDERS,
  type WhatsappTemplate,
} from "@/lib/invitation/whatsapp-message";

export function WhatsappMessageEditor({
  invitationId,
  active,
  canEdit,
  onSaved,
  coupleNames,
}: {
  invitationId: string;
  active: WhatsappTemplate;
  canEdit: boolean;
  onSaved: (template: WhatsappTemplate) => void;
  coupleNames: string;
}) {
  const [draft, setDraft] = useState(active.message);
  const [pending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(true);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const dirty = draft !== active.message;
  const error = validateWhatsappMessage(draft);
  const disabled = pending || !!active.readError;

  function insert(placeholder: string) {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = draft.slice(0, start) + placeholder + draft.slice(end);
    if (next.length > WHATSAPP_MESSAGE_MAX_LENGTH) return;
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length,
      );
    });
  }

  function persist(reset: boolean) {
    if (
      reset &&
      (active.isCustom || dirty) &&
      !window.confirm(
        "Reset pesan ke default? Pesan custom dan perubahan yang belum disimpan akan dihapus.",
      )
    )
      return;
    startTransition(async () => {
      try {
        const result = reset
          ? await resetWhatsappTemplate(invitationId)
          : await saveWhatsappTemplate(invitationId, draft);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        onSaved(result.template);
        setDraft(result.template.message);
        toast.success(
          reset ? "Pesan kembali ke default" : "Pesan berhasil disimpan",
        );
      } catch {
        toast.error(
          "Perubahan belum dapat disimpan. Coba lagi atau muat ulang halaman.",
        );
      }
    });
  }

  return (
    <section
      aria-labelledby="whatsapp-settings"
      className="space-y-4 rounded-xl border border-line bg-paper p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="whatsapp-settings" className="text-lg">
          Pengaturan Pesan WhatsApp
        </h2>
        <span className="rounded-full bg-forest/5 px-3 py-1 text-xs text-forest">
          {active.isCustom ? "Pesan Custom" : "Pesan Default"}
        </span>
      </div>
      {active.readError ? (
        <p role="alert" className="text-sm text-wine">
          {active.readError}
        </p>
      ) : null}
      {!canEdit ? (
        <p className="text-sm text-ink-soft">
          Edit pesan tersedia selama masa coba atau dengan paket Premium. Pesan
          tersimpan tetap dapat digunakan dan direset.
        </p>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="whatsapp-message" className="block text-sm font-medium">
          Template pesan
        </label>
        <textarea
          ref={textarea}
          id="whatsapp-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={disabled || !canEdit}
          maxLength={WHATSAPP_MESSAGE_MAX_LENGTH}
          rows={8}
          aria-describedby="whatsapp-message-hint"
          aria-invalid={!!error}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-60"
        />
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
          <p id="whatsapp-message-hint">
            Gunakan variabel untuk nama tamu, nama mempelai, dan tautan
            personal.
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
              disabled={disabled || !canEdit}
              onClick={() => insert(placeholder)}
              className="rounded-full border border-line px-3 py-1.5 text-xs disabled:opacity-60"
            >
              {placeholder}
            </button>
          ))}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-wine">
            {error}
          </p>
        ) : null}
        {dirty ? (
          <p className="text-xs text-ink-soft">
            Ada perubahan belum disimpan. Kirim WA tetap memakai pesan aktif
            yang tersimpan.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => persist(false)}
          disabled={disabled || !canEdit || !dirty || !!error}
          className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60"
        >
          {pending ? "Memproses…" : "Simpan Perubahan"}
        </button>
        <button
          type="button"
          onClick={() => persist(true)}
          disabled={disabled || (!active.isCustom && !dirty)}
          className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
        >
          Reset ke Default
        </button>
        <button
          type="button"
          aria-expanded={showPreview}
          aria-controls="whatsapp-preview"
          onClick={() => {
            setShowPreview(true);
            requestAnimationFrame(() => preview.current?.focus());
          }}
          className="rounded-full border border-line px-4 py-2 text-sm"
        >
          Preview Pesan
        </button>
      </div>
      {showPreview ? (
        <div
          ref={preview}
          tabIndex={-1}
          id="whatsapp-preview"
          className="space-y-2 rounded-lg border border-line bg-cream/40 p-4"
        >
          <h3 className="text-sm font-medium">Preview Pesan</h3>
          <p className="text-xs text-muted">
            Simulasi untuk Budi Santoso. Tidak mengirim pesan WhatsApp.
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {renderWhatsappMessage(
              draft,
              "Budi Santoso",
              "https://ngaturi.com/contoh?to=contoh",
              coupleNames,
            )}
          </p>
        </div>
      ) : null}
    </section>
  );
}
