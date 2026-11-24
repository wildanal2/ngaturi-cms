"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import {
  addDelegateGuest,
  addDelegateGuestsBulk,
  renameDelegateGuest,
  setDelegateGuestCategory,
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
import { CategoryCombobox } from "@/components/guests/category-combobox";
import { ContactImporter } from "@/components/guests/contact-importer";
import { GuestList } from "@/components/guests/guest-list";
import { categoryOptions } from "@/lib/invitation/guest-list";
import {
  ContactPhoneChoice,
  ContactPickButton,
} from "@/components/guests/contact-prefill-fields";
import { useContactPrefill } from "@/components/guests/use-contact-prefill";
import { DelegateMessageEditor } from "./delegate-message-editor";

const field =
  "min-h-11 rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm";

export function DelegateManager({ initial }: { initial: DelegateView }) {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState(initial);
  const [dead, setDead] = useState<keyof typeof DELEGATE_FAILURE_COPY | null>(
    null,
  );
  const [tab, setTab] = useState<"share" | "rsvp">("share");
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [category, setCategory] = useState("");
  const prefill = useContactPrefill(view.guests.map((g) => g.whatsappPhone));
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

  const categories = categoryOptions(view.guests.map((g) => g.guestGroup));
  const link = (g: Pick<DelegateGuest, "slugToken">) =>
    `${view.baseUrl}?to=${g.slugToken}`;
  const draftError = validateWhatsappMessage(draft);
  const wa = (
    g: Pick<DelegateGuest, "slugToken" | "guestName" | "whatsappPhone">,
  ) =>
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
                      prefill.reset();
                      setCategory("");
                    }
                  })
                }
                className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2"
              >
                <ContactPickButton prefill={prefill} disabled={pending} />
                <input
                  name="guest_name"
                  aria-label="Nama tamu"
                  value={prefill.name}
                  onChange={(event) => prefill.setName(event.target.value)}
                  readOnly={prefill.picking}
                  required
                  maxLength={100}
                  placeholder="Nama tamu"
                  className={field}
                />
                <CategoryCombobox
                  name="guest_group"
                  value={category}
                  onChange={setCategory}
                  options={categories}
                  disabled={pending}
                />
                <input
                  name="whatsapp_phone"
                  aria-label="No. WhatsApp"
                  value={prefill.phone}
                  onChange={(event) => prefill.setPhone(event.target.value)}
                  readOnly={prefill.picking}
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
                <ContactPhoneChoice
                  prefill={prefill}
                  existingPhones={view.guests.map((g) => g.whatsappPhone)}
                  disabled={pending}
                />
                <button
                  disabled={pending || prefill.picking}
                  className="min-h-11 rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60 sm:col-span-2"
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

          {view.canCreate && view.guests.length < view.limit ? (
            <ContactImporter
              existing={view.guests.map((g) => ({
                name: g.guestName,
                phone: g.whatsappPhone,
              }))}
              categories={categories}
              remaining={view.limit - view.guests.length}
              disabled={pending}
              onConfirm={async (items) => {
                const res = await addDelegateGuestsBulk(token, items);
                if (!res.ok) {
                  setDead(res.reason);
                  return { ok: false, error: "Akses tidak lagi berlaku." };
                }
                setView(res.view);
                return res.bulk;
              }}
            />
          ) : null}

          <DelegateMessageEditor
            base={view.template.message}
            draft={draft}
            onChange={setDraft}
            coupleNames={view.coupleNames}
            sampleName={view.guests[0]?.guestName ?? "Budi Santoso"}
            sampleLink={`${view.baseUrl}?to=contoh`}
          />

          <GuestList
            guests={view.guests.map((g) => ({ ...g }))}
            quotaLimit={view.limit}
            canEdit={view.canCreate}
            nameMax={100}
            busy={pending}
            link={link}
            waHref={draftError ? null : wa}
            waDisabledReason={draftError ?? undefined}
            onSent={(g) =>
              startTransition(
                async () =>
                  void apply(await markDelegateGuestSent(token, g.id)),
              )
            }
            onRename={async (g, name) => {
              const res = await renameDelegateGuest(token, g.id, name);
              if (!res.ok) {
                setDead(res.reason);
                return "Akses tidak lagi berlaku.";
              }
              setView(res.view);
              return res.error ?? null;
            }}
            onCategory={async (g, value) => {
              const res = await setDelegateGuestCategory(token, g.id, value);
              if (!res.ok) {
                setDead(res.reason);
                return "Akses tidak lagi berlaku.";
              }
              setView(res.view);
              return res.error ?? null;
            }}
            emptyText="Belum ada tamu. Tambahkan tamu pertama di atas."
          />
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
