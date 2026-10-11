"use client";

import { useState } from "react";
import { toast, Toaster } from "sonner";
import { RENEWAL_DAYS, RENEWAL_PRICE } from "@/lib/payments/plans";
import {
  checkoutFailureFeedback,
  PAYMENT_PENDING_MESSAGE,
} from "@/lib/payments/checkout-feedback";

export function RenewalOption({
  invitationId,
  expiresAt,
  configured,
  providerLabel = "",
}: {
  invitationId: string;
  expiresAt: string | null;
  configured: boolean;
  providerLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const expiry = expiresAt ? new Date(expiresAt) : null;

  async function renew() {
    setBusy(true);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invitationId,
          kind: "invitation_renewal",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const feedback = checkoutFailureFeedback(data, response.status);
        setVerificationPending(feedback.pending);
        if (feedback.pending) toast.info(feedback.message);
        else toast.error(feedback.message);
        setBusy(false);
        return;
      }
      if (typeof data.redirectUrl !== "string" || !data.redirectUrl)
        throw new Error("URL pembayaran tidak diterima");
      window.location.assign(data.redirectUrl);
    } catch {
      setVerificationPending(true);
      toast.info(PAYMENT_PENDING_MESSAGE);
      setBusy(false);
    }
  }

  return (
    <>
      <Toaster position="bottom-center" richColors />
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg">Perpanjang masa aktif</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Masa aktif saat ini:{" "}
          <b>
            {expiry
              ? expiry.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Jakarta",
                })
              : "belum ditentukan"}
          </b>
        </p>
        <p className="mt-3 font-display text-2xl text-forest">
          Rp {RENEWAL_PRICE.toLocaleString("id-ID")}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Menambah <b>+{RENEWAL_DAYS} hari</b>. Sisa masa aktif yang belum
          terpakai tetap dipertahankan.
        </p>

        {!configured ? (
          <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
            Pembayaran online belum aktif di lingkungan ini.
          </p>
        ) : null}

        {verificationPending ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm"
          >
            {PAYMENT_PENDING_MESSAGE}
          </p>
        ) : null}

        <button
          type="button"
          onClick={renew}
          disabled={!configured || busy || verificationPending}
          className="mt-4 w-full rounded-full bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-600 disabled:opacity-60"
        >
          {verificationPending
            ? "Menunggu verifikasi"
            : busy
              ? "Mengalihkan ke pembayaran…"
              : "Perpanjang 90 hari"}
        </button>
        <p className="mt-3 text-xs text-muted">
          Pembayaran diproses melalui {providerLabel || "penyedia pembayaran"}.
        </p>
      </section>
    </>
  );
}
