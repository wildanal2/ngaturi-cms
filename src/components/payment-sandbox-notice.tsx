import { isPaymentSandbox } from "@/lib/payments/doku";

/** Server-rendered from the same runtime endpoint used for payment requests. */
export function PaymentSandboxNotice() {
  if (!isPaymentSandbox()) return null;

  return (
    <p className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
      Mode Uji Coba / Sandbox — pembayaran tidak nyata.
    </p>
  );
}
