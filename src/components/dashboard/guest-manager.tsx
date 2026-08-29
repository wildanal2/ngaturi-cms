"use client";

import { useState, useTransition } from "react";
import { toast, Toaster } from "sonner";
import {
  createGuestInvite,
  deleteGuestInvite,
  markGuestSent,
} from "@/lib/invitation/guests";

interface Guest {
  id: string;
  guestName: string;
  guestGroup: string | null;
  slugToken: string;
  maxGuests: number;
  whatsappPhone: string | null;
  isSent: boolean;
  openedAt: string | null;
}

export function GuestManager({
  invitationId,
  baseUrl,
  guests,
}: {
  invitationId: string;
  baseUrl: string;
  guests: Guest[];
}) {
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function link(g: Guest) {
    return `${baseUrl}?to=${g.slugToken}`;
  }
  function waLink(g: Guest) {
    const text = encodeURIComponent(
      `Kepada Yth. ${g.guestName},\n\nDengan hormat kami mengundang Anda. Info & konfirmasi kehadiran:\n${link(g)}`,
    );
    const phone = g.whatsappPhone?.replace(/[^0-9]/g, "").replace(/^0/, "62");
    return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  return (
    <div className="space-y-6">
      <Toaster position="bottom-center" richColors />

      <form
        key={formKey}
        action={(fd) =>
          startTransition(async () => {
            const res = await createGuestInvite(invitationId, fd);
            if (res.ok) {
              toast.success("Tamu ditambahkan");
              setFormKey((k) => k + 1);
            } else {
              toast.error(res.error ?? "Gagal");
            }
          })
        }
        className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2"
      >
        <input
          name="guest_name"
          required
          placeholder="Nama tamu"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
        <input
          name="guest_group"
          placeholder="Grup (opsional): Keluarga, Kantor…"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
        <input
          name="whatsapp_phone"
          placeholder="No. WhatsApp (opsional)"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
        <input
          name="max_guests"
          type="number"
          min={1}
          max={10}
          defaultValue={2}
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
        <button
          disabled={pending}
          className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60 sm:col-span-2"
        >
          Tambah tamu
        </button>
      </form>

      <ul className="space-y-2">
        {guests.map((g) => (
          <li
            key={g.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4 text-sm"
          >
            <div>
              <p className="font-medium">
                {g.guestName}
                {g.guestGroup ? (
                  <span className="ml-2 text-xs text-muted">{g.guestGroup}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted">
                Maks {g.maxGuests} tamu ·{" "}
                {g.openedAt
                  ? "sudah dibuka"
                  : g.isSent
                    ? "terkirim"
                    : "belum dikirim"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(link(g));
                  toast.success("Tautan disalin");
                }}
                className="rounded-full border border-line px-3 py-1.5 hover:bg-cream-200"
              >
                Salin link
              </button>
              <a
                href={waLink(g)}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  startTransition(() => markGuestSent(invitationId, g.id))
                }
                className="rounded-full bg-forest px-3 py-1.5 font-medium text-cream"
              >
                Kirim WA
              </a>
              <button
                onClick={() =>
                  startTransition(() => deleteGuestInvite(invitationId, g.id))
                }
                className="rounded-full border border-line px-3 py-1.5 text-wine hover:bg-cream-200"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
        {guests.length === 0 ? (
          <li className="text-muted">Belum ada tamu.</li>
        ) : null}
      </ul>
    </div>
  );
}
