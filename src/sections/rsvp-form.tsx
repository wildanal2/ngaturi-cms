"use client";

import { useState } from "react";
import type { SectionRenderProps } from "./types";
import { SectionShell, SectionTitle } from "./shared";

export function RsvpFormCard({
  props,
  invitationId,
  guestName,
  isPreview,
}: SectionRenderProps) {
  const p = props as {
    max_guests_per_person?: number;
    require_phone?: boolean;
  };
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPreview) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("sending");
    setError(null);
    const res = await fetch(`/api/public/${invitationId}/rsvp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    if (res.ok) {
      setState("done");
      form.reset();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Gagal mengirim. Coba lagi.");
      setState("error");
    }
  }

  return (
    <SectionShell muted>
      <SectionTitle>Konfirmasi Kehadiran</SectionTitle>
      {state === "done" ? (
        <p className="rounded-xl bg-[var(--inv-bg)] p-6 text-center text-[var(--inv-ink)]">
          Terima kasih! Konfirmasimu sudah kami terima.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl bg-[var(--inv-bg)] p-6"
        >
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" hidden />
          <Field label="Nama">
            <input
              name="name"
              required
              defaultValue={guestName ?? ""}
              className="inv-input"
            />
          </Field>
          {p.require_phone ? (
            <Field label="No. WhatsApp">
              <input name="phone" required className="inv-input" />
            </Field>
          ) : null}
          <Field label="Kehadiran">
            <select name="status" required className="inv-input">
              <option value="attending">Hadir</option>
              <option value="not_attending">Tidak hadir</option>
              <option value="maybe">Masih ragu</option>
            </select>
          </Field>
          <Field label="Jumlah tamu">
            <input
              name="guest_count"
              type="number"
              min={1}
              max={p.max_guests_per_person ?? 2}
              defaultValue={1}
              className="inv-input"
            />
          </Field>
          <Field label="Ucapan (opsional)">
            <textarea name="message" rows={3} className="inv-input" />
          </Field>
          {error ? <p className="text-sm text-[var(--inv-secondary)]">{error}</p> : null}
          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full rounded-full bg-[var(--inv-primary)] py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {state === "sending" ? "Mengirim…" : "Kirim konfirmasi"}
          </button>
        </form>
      )}
    </SectionShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--inv-ink)]">{label}</span>
      {children}
    </label>
  );
}
