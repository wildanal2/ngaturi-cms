import {
  paymentAvailability,
  resolvePaymentProvider,
} from "@/lib/payments/registry";

/** Historical callback notices follow the stored provider, not the new-checkout selector. */
export function PaymentSandboxNotice({ provider }: { provider?: string } = {}) {
  let sandbox = false;
  try {
    sandbox = provider
      ? resolvePaymentProvider(provider).isSandbox()
      : paymentAvailability().sandbox;
  } catch {
    /* unavailable */
  }
  if (!sandbox) return null;
  return (
    <p className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
      Mode Uji Coba / Sandbox — pembayaran tidak nyata.
    </p>
  );
}
