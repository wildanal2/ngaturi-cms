import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { isRenewalEligible } from "@/lib/payments/renewal-policy";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
  Toaster: () => null,
}));

import { RenewalOption } from "./renewal-option";

describe("renewal UI", () => {
  it("is offered only for paid invitations", () => {
    expect(isRenewalEligible({ isPaid: true })).toBe(true);
    expect(isRenewalEligible({ isPaid: false })).toBe(false);
  });

  it("shows expiry, trusted price, duration, and active-time preservation", () => {
    const html = renderToStaticMarkup(
      <RenewalOption
        invitationId="invitation-1"
        expiresAt="2026-12-20T00:00:00.000Z"
        configured
      />,
    );

    expect(html).toContain("20 Desember 2026");
    expect(html).toContain("Rp 25.000");
    expect(html).toContain("+90 hari");
    expect(html).toContain("Sisa masa aktif yang belum terpakai");
    expect(html).toContain("Perpanjang 90 hari");
  });
});
