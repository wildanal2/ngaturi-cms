"use client";

import { useMemo, useRef, useState } from "react";
import {
  BULK_GUEST_MAX,
  buildBulkItems,
  chosenPhone,
  classifyContacts,
  isSelectable,
  needsPhoneChoice,
  readVcfFile,
  readySelection,
  settleBulk,
  type BulkResult,
  type BulkGuestInput,
  type Candidate,
  type BulkSummary,
} from "@/lib/invitation/contact-import";

const ROW_LIMIT = 200;

const STATUS_LABEL: Partial<Record<Candidate["status"], string>> = {
  duplicate: "Sudah terdaftar",
  repeat: "Muncul lebih dari sekali di file",
  "no-phone": "Tanpa nomor",
  "no-name": "Tanpa nama",
};

/**
 * Imports guests from a .vcf file. The file is read in the browser; only the
 * guests the user ticks and explicitly confirms are sent to `onConfirm`.
 * `remaining` is the room left for this user (null = no ceiling beyond the
 * per-confirmation maximum). The server re-validates every item and quota.
 */
export function ContactImporter({
  existing,
  remaining,
  onConfirm,
  disabled,
}: {
  existing: { name: string; phone: string | null }[];
  remaining: number | null;
  onConfirm: (items: BulkGuestInput[]) => Promise<BulkResult>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [maxGuests, setMaxGuests] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkSummary | null>(null);
  const inFlight = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const cap = Math.min(BULK_GUEST_MAX, remaining ?? BULK_GUEST_MAX);
  const ready = useMemo(
    () => readySelection(candidates ?? [], selected, choice),
    [candidates, selected, choice],
  );
  const needChoice = (candidates ?? []).filter(
    (c) => selected.has(c.id) && isSelectable(c) && needsPhoneChoice(c, choice),
  ).length;
  const addable = Math.min(ready.length, cap);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return (candidates ?? []).filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (digits.length > 0 &&
          c.phones.some((p) => p.replace(/\D/g, "").includes(digits))),
    );
  }, [candidates, query]);

  async function onFile(file: File | undefined) {
    setError(null);
    setNote(null);
    setResult(null);
    setConfirming(false);
    if (!file) return;
    const parsed = await readVcfFile(file);
    if (fileInput.current) fileInput.current.value = "";
    if (!parsed.ok) {
      setCandidates(null);
      setError(parsed.error);
      return;
    }
    setCandidates(classifyContacts(parsed.contacts, existing));
    setSelected(new Set());
    setChoice({});
    setQuery("");
    if (parsed.truncated)
      setNote("Hanya 2000 kontak pertama yang dibaca dari file ini.");
  }

  function toggle(c: Candidate) {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else if (next.size < cap) next.add(c.id);
      return next;
    });
  }

  function selectVisible() {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (next.size >= cap) break;
        if (isSelectable(c)) next.add(c.id);
      }
      return next;
    });
  }

  async function submit() {
    if (inFlight.current || !candidates || !addable) return;
    inFlight.current = true;
    setSubmitting(true);
    const sent = ready.slice(0, cap);
    let res: BulkResult;
    try {
      res = await onConfirm(buildBulkItems(sent, choice, maxGuests));
    } catch {
      res = { ok: false, error: "Koneksi bermasalah. Silakan coba lagi." };
    }
    inFlight.current = false;
    setSubmitting(false);
    setConfirming(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    const settled = settleBulk(candidates, sent, res.statuses, selected);
    setCandidates(settled.candidates);
    setSelected(settled.selected);
    setResult(settled.summary);
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-paper p-4 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={disabled}
        className="rounded-full border border-line px-4 py-2 hover:bg-cream-200 disabled:opacity-60"
      >
        Impor kontak dari file (.vcf)
      </button>
      {open ? (
        <div className="space-y-3">
          <p className="text-xs text-ink-soft">
            Pilih file .vcf hasil ekspor aplikasi Kontak (iPhone: bagikan kontak
            dari Kontak; Android: Ekspor kontak). File dibaca di perangkat ini
            dan tidak diunggah. Hanya nama dan nomor yang diambil. Tidak ada
            pesan WhatsApp yang dikirim otomatis.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard,text/directory"
            aria-label="File kontak (.vcf)"
            onChange={(event) => void onFile(event.target.files?.[0])}
            className="block w-full text-xs"
          />
          {error ? (
            <p role="alert" className="text-xs text-wine">
              {error}
            </p>
          ) : null}
          {note ? (
            <p role="status" className="text-xs text-ink-soft">
              {note}
            </p>
          ) : null}
          {result ? (
            <p role="status" className="rounded-lg bg-cream-200 p-2 text-xs">
              {result.added} ditambahkan · {result.skipped} dilewati ·{" "}
              {result.failed} gagal
              {result.failed
                ? ". Kontak yang gagal masih terpilih; tekan tombol lagi untuk mencoba ulang (yang sudah masuk tidak akan terduplikasi)."
                : "."}
            </p>
          ) : null}

          {candidates && candidates.length ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Cari kontak"
                  placeholder="Cari nama atau nomor"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={selectVisible}
                  className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-cream-200"
                >
                  Pilih yang tampil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(new Set());
                    setConfirming(false);
                  }}
                  className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-cream-200"
                >
                  Kosongkan
                </button>
              </div>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {visible.slice(0, ROW_LIMIT).map((c) => {
                  const free = c.phones.filter((p) => !c.taken.includes(p));
                  const checked = selected.has(c.id);
                  const selectable = isSelectable(c);
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={
                          !selectable || (!checked && selected.size >= cap)
                        }
                        onChange={() => toggle(c)}
                        aria-label={`Pilih ${c.name || "kontak tanpa nama"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {c.name || "(tanpa nama)"}
                        </span>
                        {free.length > 1 ? (
                          <select
                            value={chosenPhone(c, choice) ?? ""}
                            onChange={(event) => {
                              setConfirming(false);
                              setChoice((prev) => ({
                                ...prev,
                                [c.id]: event.target.value,
                              }));
                            }}
                            aria-label={`Nomor untuk ${c.name}`}
                            className="mt-1 w-full rounded border border-line bg-paper px-2 py-1 text-xs"
                          >
                            <option value="" disabled>
                              Pilih nomor
                            </option>
                            {free.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="block truncate text-xs text-muted">
                            {c.phones[0] ?? "—"}
                          </span>
                        )}
                      </span>
                      {STATUS_LABEL[c.status] ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            c.status === "no-phone"
                              ? "bg-gold/10"
                              : "bg-cream-200 text-wine"
                          }`}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
                {visible.length === 0 ? (
                  <li className="text-xs text-muted">Tidak ada yang cocok.</li>
                ) : null}
              </ul>
              {visible.length > ROW_LIMIT ? (
                <p className="text-xs text-muted">
                  Menampilkan {ROW_LIMIT} dari {visible.length}. Persempit
                  dengan pencarian.
                </p>
              ) : null}

              <label className="flex items-center gap-2 text-xs">
                Maks tamu per undangan
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxGuests}
                  onChange={(event) =>
                    setMaxGuests(
                      Math.min(
                        10,
                        Math.max(1, Number(event.target.value) || 2),
                      ),
                    )
                  }
                  className="w-16 rounded border border-line px-2 py-1"
                />
              </label>
              <p role="status" className="text-xs text-ink-soft">
                {selected.size} dipilih · {addable} dapat ditambahkan
                {needChoice ? ` · ${needChoice} perlu memilih nomor` : ""}
                {remaining !== null
                  ? ` · sisa kuota ${remaining}`
                  : ` · maksimal ${BULK_GUEST_MAX} per proses`}
              </p>

              {confirming ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-cream-200 p-3">
                  <span className="flex-1 text-xs">
                    Tambahkan {addable} tamu ke daftar? Link pribadi dibuat,
                    WhatsApp tidak dikirim otomatis.
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={submitting}
                    className="rounded-full border border-line px-3 py-1.5 text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={submitting || !addable}
                    className="rounded-full bg-forest px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-60"
                  >
                    {submitting ? "Menyimpan…" : "Ya, tambahkan"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!addable || submitting || needChoice > 0}
                  onClick={() => setConfirming(true)}
                  className="rounded-full bg-forest px-4 py-2 font-medium text-cream disabled:opacity-60"
                >
                  Tambahkan {addable} Tamu
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
