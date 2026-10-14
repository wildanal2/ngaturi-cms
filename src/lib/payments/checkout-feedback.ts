/** Client-safe messages only; importing these never loads provider credentials. */
export const PAYMENT_PENDING_CODE = "payment_pending_verification";
export const PAYMENT_PENDING_MESSAGE =
  "Pembayaran masih menunggu verifikasi. Jangan membuat transaksi baru atau membayar lagi. Tunggu konfirmasi atau hubungi tim Ngaturi jika status belum diperbarui.";

/** A lost/malformed response cannot establish that no transaction was created. */
export function checkoutFailureFeedback(data?: unknown, status?: number) {
  const body =
    data && typeof data === "object"
      ? (data as { code?: unknown; error?: unknown })
      : {};
  const message = typeof body.error === "string" ? body.error : "";
  const pending =
    body.code === PAYMENT_PENDING_CODE ||
    status === undefined ||
    !message ||
    (status >= 500 &&
      body.code !== "payment_rejected" &&
      body.code !== "payment_unavailable");
  return { pending, message: pending ? PAYMENT_PENDING_MESSAGE : message };
}
