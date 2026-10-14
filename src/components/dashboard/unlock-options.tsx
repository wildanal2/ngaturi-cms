"use client";

import { useState } from "react";
import { toast, Toaster } from "sonner";
import { PLANS, type PaidPlan } from "@/lib/payments/plans";
import {
  checkoutFailureFeedback,
  PAYMENT_PENDING_MESSAGE,
} from "@/lib/payments/checkout-feedback";

export function UnlockOptions({
  invitationId,
  configured,
  providerLabel = "",
}: {
  invitationId: string;
  configured: boolean;
  providerLabel?: string;
}) {
  const [busy, setBusy] = useState<PaidPlan | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);

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
      if (!res.ok) {
        const feedback = checkoutFailureFeedback(data, res.status);
        setVerificationPending(feedback.pending);
        if (feedback.pending) toast.info(feedback.message);
        else toast.error(feedback.message);
        setBusy(null);
        return;
      }
      if (typeof data.redirectUrl === "string" && data.redirectUrl) {
        window.location.assign(data.redirectUrl);
      } else {
        throw new Error("URL pembayaran tidak diterima");
      }
    } catch {
      // Network/JSON/redirect uncertainty must not invite a second purchase.
      setVerificationPending(true);
      toast.info(PAYMENT_PENDING_MESSAGE);
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

      {verificationPending ? (
        <p
          role="status"
          className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm"
        >
          {PAYMENT_PENDING_MESSAGE}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(PLANS).map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-line bg-paper p-5"
          >
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
              disabled={!configured || busy !== null || verificationPending}
              className="mt-4 w-full rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:opacity-60"
            >
              {verificationPending
                ? "Menunggu verifikasi"
                : busy === p.id
                  ? "Mengalihkan ke pembayaran…"
                  : `Pilih ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Pembayaran diproses melalui {providerLabel || "penyedia pembayaran"}.
      </p>
    </>
  );
}
