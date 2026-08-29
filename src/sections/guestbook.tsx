"use client";

import { useEffect, useState } from "react";
import type { SectionRenderProps } from "./types";
import { SectionShell, SectionTitle } from "./shared";
import { TurnstileField } from "./turnstile-field";

type Msg = { id: string; name: string; message: string; createdAt: string };

export function GuestbookCards({
  invitationId,
  guestName,
  isPreview,
}: SectionRenderProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [pendingNote, setPendingNote] = useState(false);

  useEffect(() => {
    if (isPreview || !invitationId) return;
    fetch(`/api/public/${invitationId}/guestbook`)
      .then((r) => r.json())
      .then((d) => setMsgs(d.messages ?? []))
      .catch(() => {});
  }, [invitationId, isPreview]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPreview) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("sending");
    const res = await fetch(`/api/public/${invitationId}/guestbook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      form.reset();
      setState("done");
      if (body.pending) setPendingNote(true);
      else if (body.message) setMsgs((m) => [body.message, ...m]);
    } else {
      setState("idle");
    }
  }

  return (
    <SectionShell>
      <SectionTitle>Ucapan &amp; Doa</SectionTitle>
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl bg-[var(--inv-bg)] p-6"
      >
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" hidden />
        <input
          name="name"
          required
          placeholder="Nama"
          defaultValue={guestName ?? ""}
          className="inv-input"
        />
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Tulis ucapan & doa…"
          className="inv-input"
        />
        <TurnstileField />
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-[var(--inv-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {state === "sending" ? "Mengirim…" : "Kirim ucapan"}
        </button>
        {pendingNote ? (
          <p className="text-sm text-[var(--inv-ink)] opacity-70">
            Ucapanmu menunggu persetujuan tuan rumah.
          </p>
        ) : null}
      </form>

      <ul className="mt-6 space-y-3">
        {msgs.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)] p-4"
          >
            <p className="font-medium text-[var(--inv-primary)]">{m.name}</p>
            <p className="mt-1 text-sm text-[var(--inv-ink)]">{m.message}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
