import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DelegateManager } from "./delegate-manager";
import { DelegateMessageEditor } from "./delegate-message-editor";
import { DEFAULT_WHATSAPP_MESSAGE } from "@/lib/invitation/whatsapp-message";
import type { DelegateView } from "@/lib/invitation/delegation";

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "t".repeat(43) }),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/lib/invitation/delegation-actions", () => ({
  addDelegateGuest: vi.fn(),
  addDelegateGuestsBulk: vi.fn(),
  fetchDelegateView: vi.fn(),
  markDelegateGuestSent: vi.fn(),
}));

const view: DelegateView = {
  title: "Acara",
  coupleNames: "Dewi & Raka",
  baseUrl: "https://ngaturi.test/slug",
  expiresAt: "2026-12-01T00:00:00.000Z",
  template: {
    message: DEFAULT_WHATSAPP_MESSAGE,
    source: "default",
    isCustom: false,
  },
  canCreate: true,
  limit: 100,
  guests: [
    {
      id: "g1",
      guestName: "Ani & <b>Budi</b>",
      guestGroup: null,
      slugToken: "dgabcdefghjk",
      maxGuests: 2,
      whatsappPhone: "0812-345",
      isSent: false,
      opened: false,
      rsvp: null,
    },
  ],
};

describe("DelegateManager message editing", () => {
  it("renders the editor section on the Share tab, collapsed, with the reseller default", () => {
    const html = renderToStaticMarkup(<DelegateManager initial={view} />);
    expect(html).toContain("Edit Pesan WhatsApp");
    expect(html).toContain("Pesan bawaan");
    expect(html).toContain('aria-expanded="false"');
    // default WA link carries the reseller message + the personal link, encoded once
    const href = /href="(https:\/\/wa\.me\/[^"]+)"/
      .exec(html)![1]
      .replace(/&amp;/g, "&")
      .replace(/&#x27;/g, "'");
    const text = new URL(href).searchParams.get("text")!;
    expect(href.startsWith("https://wa.me/62812345?text=")).toBe(true);
    expect(text).toContain("Ani & <b>Budi</b>");
    expect(text).toContain("https://ngaturi.test/slug?to=dgabcdefghjk");
    expect(text).not.toContain("{");
  });
});

describe("DelegateMessageEditor", () => {
  const props = {
    base: DEFAULT_WHATSAPP_MESSAGE,
    onChange: () => {},
    coupleNames: "Dewi & Raka",
    sampleName: "Budi",
    sampleLink: "https://ngaturi.test/slug?to=contoh",
  };
  it("shows the changed badge when the draft differs from the base", () => {
    const html = renderToStaticMarkup(
      <DelegateMessageEditor
        {...props}
        draft="Halo {nama_tamu} {link_undangan}"
      />,
    );
    expect(html).toContain("Pesan diubah");
  });
});

describe("DelegateManager contact import", () => {
  const html = (v: DelegateView) =>
    renderToStaticMarkup(<DelegateManager initial={v} />);
  it("offers import on the Share tab only, collapsed, keeping manual entry", () => {
    const out = html(view);
    expect(out).toContain("Impor kontak dari file (.vcf)");
    expect(out).toContain('name="guest_name"');
    expect(out).not.toContain('type="file"');
  });
  it("hides import when adding is disabled or the ceiling is reached", () => {
    expect(html({ ...view, canCreate: false })).not.toContain("Impor kontak");
    expect(html({ ...view, limit: 1 })).not.toContain("Impor kontak");
  });
});
