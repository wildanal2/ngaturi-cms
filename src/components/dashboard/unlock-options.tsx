"use client";

import { useState } from "react";
import { toast, Toaster } from "sonner";
import { PLANS, type PaidPlan } from "@/lib/payments/plans";

export function UnlockOptions({
  invitationId,
  configured,
}: {
  invitationId: string;
  configured: boolean;
}) {
  const [busy, setBusy] = useState<PaidPlan | null>(null);

  async function pay(plan: PaidPlan) {
    setBusy(plan);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invitationId,
          kind: "invitation_unlock",
          plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal");
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
      } else {
        throw new Error("URL pembayaran tidak diterima");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
      setBusy(null);
    }
  }

  return (
    <>
      <Toaster position="bottom-center" richColors />

      {!configured ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          Pembayaran online belum aktif di lingkungan ini. Hubungi tim Ngaturi
          untuk upgrade manual.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(PLANS).map((p) => (
          <div key={p.id} className="rounded-2xl border border-line bg-paper p-5">
            <h2 className="text-lg">{p.name}</h2>
            <p className="mt-1 font-display text-2xl text-forest">
              Rp {p.price.toLocaleString("id-ID")}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              {p.perks.map((perk) => (
                <li key={perk}>· {perk}</li>
              ))}
            </ul>
            <button
              onClick={() => pay(p.id)}
              disabled={!configured || busy !== null}
              className="mt-4 w-full rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:opacity-60"
            >
              {busy === p.id ? "Mengalihkan ke pembayaran…" : `Pilih ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Pembayaran diproses aman oleh DOKU (kartu, VA bank, e-wallet, QRIS).
      </p>
    </>
  );
}
