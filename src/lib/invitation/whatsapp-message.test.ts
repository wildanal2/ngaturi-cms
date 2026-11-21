import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHATSAPP_MESSAGE,
  renderWhatsappMessage,
  validateWhatsappMessage,
  whatsappUrl,
  whatsappCoupleNames,
} from "./whatsapp-message";

describe("WhatsApp message contract", () => {
  it("renders the requested default with couple names and preserves WhatsApp formatting", () => {
    expect(
      validateWhatsappMessage("{nama_mempelai}\n{link_undangan}"),
    ).toBeNull();
    const message = renderWhatsappMessage(
      DEFAULT_WHATSAPP_MESSAGE,
      "Budi",
      "https://ngaturi.com/contoh?to=abc",
      "Rani & Bima",
    );
    expect(message).toContain("*Assalamu'alaikum Wr. Wb.*");
    expect(message).toContain("*Bapak/Ibu/Saudara/i Budi*");
    expect(message).toContain("*Rani & Bima*");
    expect(message).toContain("https://ngaturi.com/contoh?to=abc");
    expect(message).not.toMatch(
      /\{nama_tamu\}|\{nama_mempelai\}|\{link_undangan\}/,
    );
    expect(
      renderWhatsappMessage(
        "{nama_mempelai} {link_undangan}",
        "Budi",
        "url",
        "{nama_tamu} $&",
      ),
    ).toBe("{nama_tamu} $& url");
  });
  it("uses saved cover/hero names, event title, then a safe fallback", () => {
    expect(
      whatsappCoupleNames(
        [
          { type: "hero", props: { couple_names: "Hero Names" } },
          { type: "cover", props: { names: " Cover Names " } },
        ],
        "Event",
      ),
    ).toBe("Cover Names");
    expect(
      whatsappCoupleNames(
        [
          { type: "cover", props: { names: " " } },
          { type: "hero", props: { couple_names: "Hero Names" } },
        ],
        "Event",
      ),
    ).toBe("Hero Names");
    expect(
      whatsappCoupleNames([{ type: "cover", props: { names: 42 } }], "Event"),
    ).toBe("Event");
    expect(whatsappCoupleNames(null, null)).toBe("Kedua Mempelai");
  });
  it.each([
    "",
    " \n",
    "a".repeat(2001),
    "Halo {nama_tamu}",
    "{unknown} {link_undangan}",
    "{link_undangan} {oops",
  ])("rejects invalid input %s", (message) => {
    expect(validateWhatsappMessage(message)).toBeTruthy();
  });
  it("accepts defaults, Unicode, emoji, newlines and the exact size limit", () => {
    expect(validateWhatsappMessage(DEFAULT_WHATSAPP_MESSAGE)).toBeNull();
    expect(
      validateWhatsappMessage("你好 👋\n{nama_tamu}\n{link_undangan}"),
    ).toBeNull();
    expect(
      validateWhatsappMessage(
        "x".repeat(2000 - "{link_undangan}".length) + "{link_undangan}",
      ),
    ).toBeNull();
    expect(validateWhatsappMessage(null)).toBeTruthy();
  });
  it("replaces every variable once without interpreting recipient data or HTML", () => {
    expect(
      renderWhatsappMessage(
        "{nama_tamu} {link_undangan} {nama_tamu}",
        "<b>{link_undangan}$&</b>",
        "https://example.com/a?to=abc123",
      ),
    ).toBe(
      "<b>{link_undangan}$&</b> https://example.com/a?to=abc123 <b>{link_undangan}$&</b>",
    );
  });
  it("personalizes each guest and encodes the WhatsApp text exactly once", () => {
    for (const [name, token] of [
      ["Budi Santoso", "abc123"],
      ["Dewi 🌸", "xyz456"],
    ]) {
      const link = `https://ngaturi.com/contoh?to=${token}`;
      const message = renderWhatsappMessage(
        "Halo {nama_tamu}\n{link_undangan}",
        name,
        link,
      );
      const url = new URL(whatsappUrl(message, "0812-345"));
      expect(url.pathname).toBe("/62812345");
      expect(url.searchParams.get("text")).toBe(`Halo ${name}\n${link}`);
      expect(whatsappUrl(message, null)).toMatch(/^https:\/\/wa.me\/\?text=/);
    }
  });
});
