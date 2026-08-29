"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { PLANS, type PaidPlan } from "@/lib/payments/plans";

const SNAP_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export function UnlockOptions({
  invitationId,
  configured,
  clientKey,
}: {
  invitationId: string;
  configured: boolean;
  clientKey: string;
}) {
  const router = useRouter();
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
      if (window.snap && data.token) {
        window.snap.pay(data.token, {
          onSuccess: () => {
            toast.success("Pembayaran berhasil! Undangan sedang diaktifkan.");
            setTimeout(() => router.refresh(), 2000);
          },
          onPending: () => toast.info("Menunggu pembayaran…"),
          onError: () => toast.error("Pembayaran gagal."),
          onClose: () => setBusy(null),
        });
      } else if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Toaster position="bottom-center" richColors />
      {configured && clientKey ? (
        <Script src={SNAP_SANDBOX} data-client-key={clientKey} strategy="afterInteractive" />
      ) : null}

      {!configured ? (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
          Pembayaran online belum aktif di lingkungan ini. Hubungi tim Ngaturi
          untuk upgrade manual.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.values(PLANS)).map((p) => (
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
              {busy === p.id ? "Memproses…" : `Pilih ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
