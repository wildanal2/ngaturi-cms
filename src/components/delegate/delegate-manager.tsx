"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import {
  addDelegateGuest,
  fetchDelegateView,
  markDelegateGuestSent,
  type DelegateResult,
} from "@/lib/invitation/delegation-actions";
import type { DelegateGuest, DelegateView } from "@/lib/invitation/delegation";
import {
  DELEGATE_FAILURE_COPY,
  formatDelegateDate,
  RSVP_LABEL,
} from "@/lib/invitation/delegation-format";
import {
  renderWhatsappMessage,
  validateWhatsappMessage,
  whatsappUrl,
} from "@/lib/invitation/whatsapp-message";
import { DelegateMessageEditor } from "./delegate-message-editor";

const field = "rounded-lg border border-line bg-paper px-3 py-2 text-sm";

export function DelegateManager({ initial }: { initial: DelegateView }) {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState(initial);
  const [dead, setDead] = useState<keyof typeof DELEGATE_FAILURE_COPY | null>(
    null,
  );
  const [tab, setTab] = useState<"share" | "rsvp">("share");
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  // Session-only edit of the reseller's message; never persisted or sent.
  const [draft, setDraft] = useState(initial.template.message);

  function apply(res: DelegateResult) {
    if (!res.ok) {
      setDead(res.reason);
      return false;
    }
    setView(res.view);
    if (res.error) {
      toast.error(res.error);
      return false;
    }
    return true;
  }

  if (dead) {
    const copy = DELEGATE_FAILURE_COPY[dead];
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4 py-10 text-center">
        <h1 className="text-2xl">{copy.title}</h1>
        <p role="alert" className="text-sm text-ink-soft">
          {copy.body}
        </p>
      </main>
    );
  }

  const link = (g: DelegateGuest) => `${view.baseUrl}?to=${g.slugToken}`;
  const draftError = validateWhatsappMessage(draft);
  const wa = (g: DelegateGuest) =>
    whatsappUrl(
      renderWhatsappMessage(draft, g.guestName, link(g), view.coupleNames),
      g.whatsappPhone,
    );
  const count = (s: string) =>
    view.guests.filter((g) => g.rsvp?.status === s).length;
  const attendingPeople = view.guests.reduce(
    (n, g) => n + (g.rsvp?.status === "attending" ? g.rsvp.guestCount : 0),
    0,
  );

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <Toaster position="bottom-center" richColors />
      <header>
        <p className="text-xs text-muted">Akses kelola tamu</p>
        <h1 className="text-2xl">{view.title}</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Akses berlaku sampai {formatDelegateDate(view.expiresAt)}. Anda hanya
          dapat menambah tamu baru dan memantau RSVP tamu yang Anda tambahkan.
        </p>
      </header>

      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-full border border-line p-1 text-sm"
      >
        {(
          [
            ["share", "Share Undangan"],
            ["rsvp", "Konfirmasi RSVP"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-2 font-medium ${
              tab === id ? "bg-forest text-cream" : "hover:bg-cream-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "share" ? (
        <section className="space-y-4" aria-label="Share Undangan">
          {view.canCreate ? (
            view.guests.length >= view.limit ? (
              <p role="status" className="text-sm text-wine">
                Batas {view.limit} tamu tercapai.
              </p>
            ) : (
              <form
                key={formKey}
                action={(fd) =>
                  startTransition(async () => {
                    if (apply(await addDelegateGuest(token, fd))) {
                      toast.success("Tamu ditambahkan");
                      setFormKey((k) => k + 1);
                    }
                  })
                }
                className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2"
              >
                <input
                  name="guest_name"
                  aria-label="Nama tamu"
                  required
                  maxLength={100}
                  placeholder="Nama tamu"
                  className={field}
                />
                <input
                  name="guest_group"
                  aria-label="Grup"
                  maxLength={100}
                  placeholder="Grup (opsional)"
                  className={field}
                />
                <input
                  name="whatsapp_phone"
                  aria-label="No. WhatsApp"
                  inputMode="tel"
                  maxLength={50}
                  placeholder="No. WhatsApp (opsional)"
                  className={field}
                />
                <input
                  name="max_guests"
                  aria-label="Maks tamu"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={2}
                  className={field}
                />
                <button
                  disabled={pending}
                  className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60 sm:col-span-2"
                >
                  {pending ? "Menyimpan…" : "Tambah tamu"}
                </button>
              </form>
            )
          ) : (
            <p
              role="status"
              className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm"
            >
              Penambahan tamu belum tersedia untuk undangan ini. Hubungi pembuat
              undangan.
            </p>
          )}

          <DelegateMessageEditor
            base={view.template.message}
            draft={draft}
            onChange={setDraft}
            coupleNames={view.coupleNames}
            sampleName={view.guests[0]?.guestName ?? "Budi Santoso"}
            sampleLink={`${view.baseUrl}?to=contoh`}
          />

          <ul className="space-y-2">
            {view.guests.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {g.guestName}
                    {g.guestGroup ? (
                      <span className="ml-2 text-xs text-muted">
                        {g.guestGroup}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    Maks {g.maxGuests} tamu ·{" "}
                    {g.opened
                      ? "sudah dibuka"
                      : g.isSent
                        ? "terkirim"
                        : "belum dikirim"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link(g));
                        toast.success("Tautan disalin");
                      } catch {
                        toast.error(
                          "Gagal menyalin. Salin manual dari tombol Kirim WA.",
                        );
                      }
                    }}
                    className="rounded-full border border-line px-3 py-1.5 hover:bg-cream-200"
                  >
                    Salin link
                  </button>
                  {draftError ? (
                    <button
                      type="button"
                      disabled
                      title={draftError}
                      className="rounded-full bg-forest px-3 py-1.5 font-medium text-cream opacity-50"
                    >
                      Kirim WA
                    </button>
                  ) : (
                    <a
                      href={wa(g)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        startTransition(
                          async () =>
                            void apply(
                              await markDelegateGuestSent(token, g.id),
                            ),
                        )
                      }
                      className="rounded-full bg-forest px-3 py-1.5 font-medium text-cream"
                    >
                      Kirim WA
                    </a>
                  )}
                </div>
              </li>
            ))}
            {view.guests.length === 0 ? (
              <li className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
                Belum ada tamu. Tambahkan tamu pertama di atas.
              </li>
            ) : null}
          </ul>
        </section>
      ) : (
        <section className="space-y-4" aria-label="Konfirmasi RSVP">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Tamu dibuat" value={view.guests.length} />
            <Stat label="Hadir (orang)" value={attendingPeople} />
            <Stat label="Tidak hadir" value={count("not_attending")} />
            <Stat
              label="Belum merespons"
              value={
                view.guests.filter(
                  (g) => !g.rsvp || g.rsvp.status === "pending",
                ).length
              }
            />
          </div>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(
                async () => void apply(await fetchDelegateView(token)),
              )
            }
            className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-cream-200 disabled:opacity-60"
          >
            {pending ? "Memuat…" : "Muat ulang"}
          </button>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-cream-200 text-left text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Status RSVP</th>
                  <th className="px-3 py-2">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {view.guests.map((g) => (
                  <tr key={g.id} className="border-t border-line">
                    <td className="px-3 py-2">{g.guestName}</td>
                    <td className="px-3 py-2">
                      {g.rsvp ? RSVP_LABEL[g.rsvp.status] : "Belum merespons"}
                    </td>
                    <td className="px-3 py-2">
                      {g.rsvp ? g.rsvp.guestCount : "–"}
                    </td>
                  </tr>
                ))}
                {view.guests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-6 text-center text-muted"
                    >
                      Belum ada tamu dari akses ini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <p className="text-xl font-medium">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}
