import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuestList, type GuestListProps } from "./guest-list";
import { CategoryCombobox } from "./category-combobox";
import {
  NAME_LOCKED_MESSAGE,
  type ListGuest,
} from "@/lib/invitation/guest-list";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const guest = (i: number, over: Partial<ListGuest> = {}): ListGuest => ({
  id: `g${i}`,
  guestName: `Tamu ${i}`,
  guestGroup: null,
  slugToken: `tok${i}`,
  maxGuests: 2,
  whatsappPhone: null,
  isSent: false,
  opened: false,
  ...over,
});
function render(guests: ListGuest[], over: Partial<GuestListProps> = {}) {
  return renderToStaticMarkup(
    <GuestList
      guests={guests}
      canEdit
      nameMax={100}
      link={(x) => `https://ngaturi.test/s?to=${x.slugToken}`}
      waHref={(x) => `https://wa.me/?text=${x.slugToken}`}
      onSent={() => {}}
      onRename={async () => null}
      onCategory={async () => null}
      emptyText="Belum ada tamu."
      {...over}
    />,
  );
}

describe("GuestList markup", () => {
  it("always shows both independent status indicators with text, not colour alone", () => {
    const html = render([
      guest(1),
      guest(2, { isSent: true }),
      guest(3, { opened: true }),
      guest(4, { isSent: true, opened: true }),
    ]);
    const cards = html.split("<li ").slice(1);
    const has = (card: string, t: string) => card.includes(t);
    expect(
      has(cards[0], "Belum dikirim") && has(cards[0], "Belum dibuka"),
    ).toBe(true);
    expect(
      has(cards[1], "Sudah dikirim") && has(cards[1], "Belum dibuka"),
    ).toBe(true);
    // Not sent, but opened: the combination the old combined label could not express.
    expect(
      has(cards[2], "Belum dikirim") && has(cards[2], "Sudah dibuka"),
    ).toBe(true);
    expect(
      has(cards[3], "Sudah dikirim") && has(cards[3], "Sudah dibuka"),
    ).toBe(true);
    expect(html).toContain("text-forest");
    expect(html).toContain("text-muted");
    expect(html).not.toMatch(/text-(red|wine)[^"]*"[^>]*>\s*<svg/);
    expect(html).toContain(
      "bukan konfirmasi pengiriman atau dibaca dari WhatsApp",
    );
  });
  it("shows stats, result count, 25 cards per page and pagination controls", () => {
    const html = render(Array.from({ length: 60 }, (_, i) => guest(i)));
    expect(html).toContain("Total Tamu");
    expect(html).toContain("Dikirim");
    expect(html).toContain("Dibuka");
    expect(html).toContain("Menampilkan 60 dari 60 tamu");
    expect(html.match(/Salin link/g)).toHaveLength(25);
    expect(html).toContain("Halaman 1 dari 3");
    expect(html).toMatch(/<button[^>]+disabled=""[^>]*>Sebelumnya<\/button>/);
  });
  it("omits pagination for one page and renders the empty states", () => {
    expect(render([guest(1)])).not.toContain("Halaman 1");
    expect(render([])).toContain("Belum ada tamu.");
  });
  it("renders a neutral category tag only when set and offers category actions", () => {
    const html = render([guest(1, { guestGroup: "Teman Kantor" }), guest(2)]);
    expect(html.match(/bg-cream-200 px-2\.5/g)).toHaveLength(1);
    expect(html).toContain("Teman Kantor");
    // Secondary actions live in a per-card menu that is closed on first paint.
    expect(html.match(/aria-haspopup="menu"/g)).toHaveLength(2);
    expect(html).not.toContain('role="menu"');
    expect(html).toContain("Semua kategori");
    expect(html).toContain("Tanpa kategori");
  });
  it("explains the name lock in the always-visible note and keeps the menu closed", () => {
    const html = render([
      guest(1, { isSent: true }),
      guest(2, { opened: true }),
      guest(3),
    ]);
    expect(html).toContain(NAME_LOCKED_MESSAGE);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="menuitem"');
  });
  it("renders no menu without edit rights, and offers one when the owner can delete", () => {
    const view = render([guest(1)], { canEdit: false });
    expect(view).not.toContain("Lainnya");
    expect(render([guest(1)], { onDelete: () => {} })).toContain("Lainnya");
    expect(render([guest(1)])).toContain("Tindakan lain untuk Tamu 1");
  });
  it("shows the delegate quota consistently from one limit", () => {
    const html = render(
      Array.from({ length: 12 }, (_, i) => guest(i)),
      { quotaLimit: 999 },
    );
    expect(html).toContain("12 dari 999 tamu · sisa kuota 987");
  });
  it("disables sending with a reason when the message draft is invalid", () => {
    const html = render([guest(1)], {
      waHref: null,
      waDisabledReason: "Pesan kosong",
    });
    expect(html).toMatch(
      /<button[^>]+disabled=""[^>]*title="Pesan kosong"[^>]*>Kirim WA<\/button>/,
    );
  });
  it("has an accessible search box, collapsible filters and no browser API on the server", () => {
    const html = render([guest(1)]);
    expect(html).toContain('aria-label="Cari nama atau nomor"');
    expect(html).toContain('aria-controls="guest-filters"');
    expect(html).toContain("Belum dikirim");
    expect(html).toContain("Belum dibuka");
  });
});

describe("CategoryCombobox", () => {
  it("renders an ARIA combobox with a hidden form value, closed by default", () => {
    const html = renderToStaticMarkup(
      <CategoryCombobox
        name="guest_group"
        value=" Teman  Kantor "
        onChange={() => {}}
        options={["Keluarga"]}
      />,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(
      'type="hidden" name="guest_group" value="Teman Kantor"',
    );
    expect(html).not.toContain('role="listbox"');
  });
});
