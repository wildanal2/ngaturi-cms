import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuestManager } from "./guest-manager";
import {
  DEFAULT_WHATSAPP_MESSAGE,
  type WhatsappTemplate,
} from "@/lib/invitation/whatsapp-message";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/lib/invitation/guests", () => ({
  createGuestInvite: vi.fn(),
  deleteGuestInvite: vi.fn(),
  markGuestSent: vi.fn(),
}));
vi.mock("@/lib/invitation/whatsapp-message-actions", () => ({
  saveWhatsappTemplate: vi.fn(),
  resetWhatsappTemplate: vi.fn(),
}));

const guests = ["Budi Santoso", "<img src=x onerror=alert(1)> 🌸"].map(
  (guestName, i) => ({
    id: `guest-${i}`,
    guestName,
    guestGroup: null,
    slugToken: `token${i}`,
    maxGuests: 2,
    whatsappPhone: i === 0 ? "0812-345" : null,
    isSent: false,
    openedAt: null,
  }),
);
function render(template: WhatsappTemplate, canCreate = true) {
  return renderToStaticMarkup(
    <GuestManager
      invitationId="inv-1"
      baseUrl="https://ngaturi.com/contoh"
      coupleNames="Rani & Bima"
      guests={guests}
      canCreate={canCreate}
      initialWhatsappTemplate={template}
    />,
  );
}
function decodeHtmlAttribute(value: string) {
  return value.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
}

describe("guest WhatsApp rendering integration", () => {
  it("keeps the manual form available and does not call browser APIs during server rendering", () => {
    const select = vi.fn();
    vi.stubGlobal("navigator", { contacts: { select } });
    try {
      const html = render({
        message: DEFAULT_WHATSAPP_MESSAGE,
        source: "default",
        isCustom: false,
      });
      expect(html).toContain('name="guest_name"');
      expect(html).toContain('name="whatsapp_phone"');
      expect(html).toContain('name="guest_group"');
      expect(html).toContain('name="max_guests"');
      expect(html).toContain("Tambah tamu");
      expect(html).not.toContain("Ambil dari Kontak HP");
      expect(select).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("does not expose contact import or the creation form without existing entitlement", () => {
    const html = render(
      { message: DEFAULT_WHATSAPP_MESSAGE, source: "default", isCustom: false },
      false,
    );
    expect(html).not.toContain('name="guest_name"');
    expect(html).not.toContain("Ambil dari Kontak HP");
  });
  it("renders the server's saved custom template into each personal WA link", () => {
    const html = render({
      message: "Halo {nama_tamu} 👋\n{link_undangan}",
      source: "custom",
      isCustom: true,
    });
    const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^\"]+)"/g)].map(
      (match) => new URL(decodeHtmlAttribute(match[1])),
    );
    expect(links).toHaveLength(2);
    links.forEach((url, i) => {
      expect(url.searchParams.get("text")).toBe(
        `Halo ${guests[i].guestName} 👋\nhttps://ngaturi.com/contoh?to=token${i}`,
      );
    });
    expect(links[0].pathname).toBe("/62812345");
    expect(links[1].pathname).toBe("/");
    expect(html).toContain("Pesan Custom");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html.match(/Salin link/g)).toHaveLength(2);
  });
  it("renders defaults and the sample preview without enabling unchanged saves", () => {
    const html = render({
      message: DEFAULT_WHATSAPP_MESSAGE,
      source: "default",
      isCustom: false,
    });
    expect(html).toContain("Pesan Default");
    expect(html).toContain("*Bapak/Ibu/Saudara/i Budi Santoso*");
    expect(html).toContain("*Rani &amp; Bima*");
    const wa = html.match(/href="(https:\/\/wa\.me\/[^\"]+)"/);
    const text = new URL(decodeHtmlAttribute(wa![1])).searchParams.get("text");
    expect(text).toContain("*Rani & Bima*");
    expect(text).not.toContain("{nama_mempelai}");
    expect(html).toContain("https://ngaturi.com/contoh?to=contoh");
    expect(html).toMatch(
      /<button[^>]+disabled=""[^>]*>Simpan Perubahan<\/button>/,
    );
  });
  it("retains custom sending after entitlement ends while disabling editing", () => {
    const html = render(
      { message: "Saved {link_undangan}", source: "custom", isCustom: true },
      false,
    );
    expect(html).toContain("Pesan Custom");
    expect(html).toMatch(/<textarea[^>]+disabled=""/);
    expect(html).toMatch(/<button[^>]*>Reset ke Default<\/button>/);
    expect(html).toContain(
      "Saved%20https%3A%2F%2Fngaturi.com%2Fcontoh%3Fto%3Dtoken0",
    );
  });
  it("shows the read fallback warning and prevents mutation when Redis could not be read", () => {
    const html = render({
      message: DEFAULT_WHATSAPP_MESSAGE,
      source: "default",
      isCustom: false,
      readError: "Pesan belum dapat dibaca",
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Pesan belum dapat dibaca");
    expect(html).toMatch(/<textarea[^>]+disabled=""/);
    expect(html).toMatch(
      /<button[^>]+disabled=""[^>]*>Reset ke Default<\/button>/,
    );
  });
});
