import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { checkOrderStatus } from "@/lib/payments/doku";
import { applyDokuResult, invitationIdForInvoice } from "@/lib/payments/grant";
import { PaymentSandboxNotice } from "@/components/payment-sandbox-notice";

/**
 * Where DOKU sends the buyer back after checkout (auto_redirect). The
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
    (sp.invoice_number as string) ||
    (sp.order_id as string) ||
    (sp.invoice as string) ||
    "";

  let result:
    "paid" | "expired" | "failed" | "pending" | "refunded" | "unknown" =
    "unknown";
  let invitationId: string | null = null;

  if (invoice) {
    invitationId = await invitationIdForInvoice(invoice, db);
    try {
      const paymentResult = await checkOrderStatus(invoice);
      const applied = await applyDokuResult(
        paymentResult,
        {
          source: "status_query",
        },
        db,
      );
      result = applied.status;
    } catch {
      result = "pending";
    }
  }

  if (invitationId) {
    redirect(`/invitations/${invitationId}?pay=${result}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <PaymentSandboxNotice />
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
