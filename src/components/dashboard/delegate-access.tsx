"use client";

import { useState, useTransition } from "react";
import { toast, Toaster } from "sonner";
import {
  createDelegateLink,
  revokeDelegateLink,
} from "@/lib/invitation/delegation-actions";
import { formatDelegateDate } from "@/lib/invitation/delegation-format";

interface Status {
  active: boolean;
  expiresAt: string | null;
  unavailable?: boolean;
}

export function DelegateAccess({
  invitationId,
  initial,
}: {
  invitationId: string;
  initial: Status;
}) {
  const [status, setStatus] = useState<Status>(initial);
  const [link, setLink] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      try {
        const res = await createDelegateLink(invitationId, days);
        if (!res.ok) return void toast.error(res.error);
        setLink(res.url);
        setStatus({ active: true, expiresAt: res.expiresAt });
        toast.success("Tautan akses dibuat");
      } catch {
        toast.error("Gagal membuat tautan. Silakan coba lagi.");
      }
    });
  }

  function revoke() {
    startTransition(async () => {
      try {
        const res = await revokeDelegateLink(invitationId);
        if (!res.ok)
          return void toast.error(res.error ?? "Gagal mencabut akses.");
        setStatus({ active: false, expiresAt: null });
        setLink(null);
        setConfirmRevoke(false);
        toast.success("Akses dicabut");
      } catch {
        toast.error("Gagal mencabut akses. Silakan coba lagi.");
      }
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Tautan disalin");
    } catch {
      toast.error("Gagal menyalin. Salin manual dari kolom tautan.");
    }
  }

  return (
    <section
      aria-label="Bagikan Akses Kelola Tamu"
      className="space-y-3 rounded-xl border border-line bg-paper p-4"
    >
      <Toaster position="bottom-center" richColors />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">Bagikan Akses Kelola Tamu</h2>
        <span
          className={`rounded-full px-3 py-0.5 text-xs ${status.active ? "bg-forest/10 text-forest" : "bg-cream-200 text-ink-soft"}`}
        >
          {status.unavailable
            ? "Status belum dapat dimuat"
            : status.active && status.expiresAt
              ? `Aktif sampai ${formatDelegateDate(status.expiresAt)}`
              : "Tidak aktif"}
        </span>
      </div>
      <p className="text-sm text-ink-soft">
        Beri pelanggan tautan untuk membuat tautan undangan per-tamu baru dan
        melihat nama serta status RSVP tamu yang ia buat — tanpa akun Ngaturi.
        Pelanggan tidak dapat melihat kontak, tautan, atau pesan tamu lain,
        mengubah undangan, maupun menghapus data.
      </p>
      {status.unavailable ? (
        <p role="alert" className="text-xs text-wine">
          Status akses belum dapat dibaca karena layanan penyimpanan sedang
          bermasalah. Muat ulang halaman sebelum membuat atau mencabut tautan.
        </p>
      ) : null}
      {link ? (
        <div className="space-y-2">
          <input
            readOnly
            aria-label="Tautan akses delegasi"
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-line bg-cream-200 px-3 py-2 text-xs"
          />
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              onClick={copy}
              className="rounded-full bg-forest px-4 py-1.5 font-medium text-cream"
            >
              Salin
            </button>
            {typeof navigator !== "undefined" && "share" in navigator ? (
              <button
                onClick={() => navigator.share({ url: link }).catch(() => {})}
                className="rounded-full border border-line px-4 py-1.5 hover:bg-cream-200"
              >
                Bagikan
              </button>
            ) : null}
          </div>
          <p role="status" className="text-xs text-wine">
            Tautan hanya ditampilkan sekali. Simpan sekarang; jika hilang, buat
            tautan baru (tautan lama otomatis dicabut).
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-ink-soft">Berlaku</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-line bg-paper px-2 py-1.5"
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} hari
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={create}
          disabled={pending}
          className="rounded-full border border-line px-4 py-1.5 hover:bg-cream-200 disabled:opacity-60"
        >
          {pending
            ? "Memproses…"
            : status.active
              ? "Buat tautan baru"
              : "Buat tautan"}
        </button>
        {status.active ? (
          confirmRevoke ? (
            <>
              <button
                onClick={revoke}
                disabled={pending}
                className="rounded-full bg-wine px-4 py-1.5 font-medium text-cream disabled:opacity-60"
              >
                Ya, cabut akses
              </button>
              <button
                onClick={() => setConfirmRevoke(false)}
                className="rounded-full border border-line px-4 py-1.5"
              >
                Batal
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmRevoke(true)}
              className="rounded-full border border-line px-4 py-1.5 text-wine hover:bg-cream-200"
            >
              Cabut akses
            </button>
          )
        ) : null}
      </div>
      {confirmRevoke ? (
        <p className="text-xs text-ink-soft">
          Pelanggan langsung kehilangan akses kelola. Tautan undangan tamu yang
          sudah dibagikan tetap berfungsi untuk RSVP.
        </p>
      ) : null}
    </section>
  );
}
