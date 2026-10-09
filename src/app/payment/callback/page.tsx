import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { resolvePaymentCallback } from "@/lib/payments/callback";
import { PaymentSandboxNotice } from "@/components/payment-sandbox-notice";

/**
 * Where the provider returns the buyer after checkout. The
 * webhook is the source of truth; here we re-check once in case it's
 * delayed, then bounce to the invitation.
 */
export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const db = getDb();
  const sp = await searchParams;
  const invoice =
    [sp.invoice_number, sp.order_id, sp.invoice].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    ) || "";

  let result:
    "paid" | "expired" | "failed" | "pending" | "refunded" | "unknown" =
    "unknown";
  let invitationId: string | null = null;
  let storedProvider: string | undefined;

  if (invoice) {
    const payment = await resolvePaymentCallback(invoice, db);
    if (payment) {
      invitationId = payment.invitationId;
      result = payment.status;
      storedProvider = payment.provider;
    }
  }

  if (invitationId) {
    redirect(`/invitations/${invitationId}?pay=${result}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <PaymentSandboxNotice provider={storedProvider} />
      <h1 className="font-display text-2xl">
        {result === "paid"
          ? "Pembayaran berhasil 🎉"
          : result === "refunded"
            ? "Pembayaran telah direfund"
            : result === "pending"
              ? "Pembayaran sedang diproses"
              : "Status pembayaran"}
      </h1>
      <p className="text-ink-soft">
        {result === "paid"
          ? "Undangan kamu sudah diaktifkan."
          : result === "refunded"
            ? "Status finansial refund sudah tercatat."
            : "Kami akan memperbarui status begitu pembayaran dikonfirmasi."}
      </p>
      <Link href="/invitations" className="mt-2 text-forest underline">
        Ke daftar undangan
      </Link>
    </main>
  );
}
