"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { Divider, FloatingLeaves } from "../ornaments";
import { TurnstileField } from "../turnstile-field";

type Msg = { id: string; name: string; message: string; createdAt: string };

const NAME_MAX = 25;
const MSG_MAX = 255;
const PAGE = 6;

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    seed,
  )}&radius=50&backgroundColor=f4f6f2`;

function Counter({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, (current / max) * 100);
  const c = 2 * Math.PI * 8;
  const danger = pct > 92;
  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      <svg className="h-5 w-5 -rotate-90">
        <circle cx="10" cy="10" r="8" strokeWidth="2" fill="none" className="stroke-black/15" />
        <circle
          cx="10"
          cy="10"
          r="8"
          strokeWidth="2"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={danger ? "stroke-wine" : "stroke-[var(--inv-secondary)]"}
        />
      </svg>
      {pct >= 75 ? (
        <span className={`absolute text-[9px] ${danger ? "text-wine" : "text-[var(--inv-secondary)]"}`}>
          {max - current}
        </span>
      ) : null}
    </span>
  );
}

function Bubble({ m }: { m: Msg }) {
  const time = m.createdAt
    ? new Date(m.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : "";
  return (
    <div className="flex items-start gap-2">
      <Image
        src={avatar(m.name || "Tamu")}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="mt-1 h-8 w-8 shrink-0 rounded-full shadow"
      />
      <div className="min-h-[52px] flex-1 rounded-md bg-white px-3 py-1.5 text-left shadow">
        <p className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-[var(--inv-ink)]">{m.name}</span>
          <span className="text-[10px] text-[var(--inv-ink)] opacity-50">{time}</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--inv-ink)]">{m.message}</p>
      </div>
    </div>
  );
}

/** Chat-bubble guestbook with avatar picker + circular char counters. */
export function GuestbookChat({
  invitationId,
  guestName,
  isPreview,
}: SectionRenderProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [page, setPage] = useState(1);
  const [name, setName] = useState(() => guestName ?? "");
  const [message, setMessage] = useState("");
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
    if (isPreview || !invitationId) return;
    const fd = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch(`/api/public/${invitationId}/guestbook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setName("");
      setMessage("");
      setState("done");
      if (body.pending) setPendingNote(true);
      else if (body.message) setMsgs((m) => [body.message, ...m]);
    } else {
      setState("idle");
    }
  }

  const shown = msgs.slice(0, page * PAGE);

  return (
    <section className="relative overflow-hidden px-6 py-16">
      <FloatingLeaves />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <p className="text-[var(--inv-ink)]">Buku Tamu &amp; Ucapan</p>
        <div className="mt-4 w-full rounded-3xl bg-[var(--inv-bg)] p-6 text-center shadow-lg">
          <p className="font-[family-name:var(--inv-font)] text-2xl font-bold text-[var(--inv-primary)]">
            Buku Tamu
          </p>
          <Divider className="mx-auto mt-2 h-4 w-32 text-[var(--inv-secondary)] opacity-70" />

          <div className="mt-5 min-h-[160px] space-y-3 border-b border-black/10 pb-5">
            {shown.length === 0 ? (
              <p className="py-6 text-sm text-[var(--inv-ink)] opacity-50">
                Jadilah yang pertama memberi ucapan.
              </p>
            ) : (
              shown.map((m) => <Bubble key={m.id} m={m} />)
            )}
            {msgs.length > shown.length ? (
              <button
                type="button"
                onClick={() => setPage((n) => n + 1)}
                className="rounded border border-[var(--inv-secondary)] px-3 py-1 text-xs text-[var(--inv-secondary)]"
              >
                Muat lebih banyak
              </button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-2 text-left">
            <input type="text" name="_hp" tabIndex={-1} autoComplete="off" hidden />
            <label className="block text-sm text-[var(--inv-ink)]">Nama</label>
            <div className="relative">
              <input
                name="name"
                required
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tulis nama Anda…"
                className="w-full rounded border border-black/15 bg-white px-3 py-2 pr-9 text-sm"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Counter current={name.length} max={NAME_MAX} />
              </span>
            </div>
            <label className="block text-sm text-[var(--inv-ink)]">Ucapan</label>
            <div className="relative">
              <textarea
                name="message"
                required
                rows={3}
                value={message}
                maxLength={MSG_MAX}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis ucapan & doa…"
                className="w-full rounded border border-black/15 bg-white px-3 py-2 pr-9 text-sm"
              />
              <span className="absolute right-2.5 top-2.5">
                <Counter current={message.length} max={MSG_MAX} />
              </span>
            </div>
            <TurnstileField />
            <button
              type="submit"
              disabled={state === "sending"}
              className="rounded-lg bg-[var(--inv-secondary)] px-5 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {state === "sending" ? "Mengirim…" : "Kirim"}
            </button>
            {pendingNote ? (
              <p className="text-xs text-[var(--inv-ink)] opacity-70">
                Ucapan Anda menunggu persetujuan tuan rumah.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
