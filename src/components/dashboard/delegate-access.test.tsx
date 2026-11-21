import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DelegateAccess } from "./delegate-access";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/lib/invitation/delegation-actions", () => ({
  createDelegateLink: vi.fn(),
  revokeDelegateLink: vi.fn(),
}));

const html = (initial: Parameters<typeof DelegateAccess>[0]["initial"]) =>
  renderToStaticMarkup(<DelegateAccess invitationId="inv" initial={initial} />);

describe("DelegateAccess status", () => {
  it("shows an inactive state with a create control", () => {
    const out = html({ active: false, expiresAt: null });
    expect(out).toContain("Bagikan Akses Kelola Tamu");
    expect(out).toContain("Tidak aktif");
    expect(out).toContain("Buat tautan");
    expect(out).not.toContain("Cabut akses");
  });

  it("shows expiry and revoke when active", () => {
    const out = html({ active: true, expiresAt: "2026-12-01T03:00:00.000Z" });
    expect(out).toMatch(/Aktif sampai .* WIB/);
    expect(out).toContain("Cabut akses");
    expect(out).toContain("Buat tautan baru");
  });

  it("does not claim 'inactive' when the status could not be read", () => {
    const out = html({ active: false, expiresAt: null, unavailable: true });
    expect(out).toContain("Status belum dapat dimuat");
    expect(out).toContain("layanan penyimpanan sedang bermasalah");
    expect(out).not.toContain("Tidak aktif");
  });
});
