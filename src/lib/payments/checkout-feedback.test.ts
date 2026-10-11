import { describe, expect, it } from "vitest";
import {
  checkoutFailureFeedback,
  PAYMENT_PENDING_CODE,
  PAYMENT_PENDING_MESSAGE,
} from "./checkout-feedback";

describe("checkout uncertainty feedback", () => {
  it.each([
    [undefined, undefined],
    [null, 502],
    [{ error: "Internal server error" }, 500],
    [{ error: "Unknown outcome" }, 502],
    [{ error: "Still pending", code: PAYMENT_PENDING_CODE }, 409],
    [{ error: "Still pending", code: PAYMENT_PENDING_CODE }, 502],
  ])("keeps an uncertain response %j / %s pending", (body, status) => {
    expect(checkoutFailureFeedback(body, status)).toEqual({
      pending: true,
      message: PAYMENT_PENDING_MESSAGE,
    });
    expect(PAYMENT_PENDING_MESSAGE).toContain(
      "Jangan membuat transaksi baru atau membayar lagi",
    );
  });
  it.each([
    [{ error: "Not configured", code: "payment_unavailable" }, 503],
    [{ error: "Definitive DOKU rejection", code: "payment_rejected" }, 502],
    [{ error: "Undangan ini sudah aktif." }, 409],
    [{ error: "Data tidak valid." }, 400],
  ])("preserves a known pre-create/rejection error %j / %s", (body, status) => {
    expect(checkoutFailureFeedback(body, status)).toEqual({
      pending: false,
      message: body.error,
    });
  });
});
