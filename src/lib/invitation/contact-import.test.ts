import { describe, expect, it, vi } from "vitest";
import {
  BULK_GUEST_MAX,
  VCF_ERRORS,
  VCF_MAX_BYTES,
  VCF_MAX_CONTACTS,
  buildBulkItems,
  classifyContacts,
  duplicateTracker,
  findBulkDuplicates,
  normalizePhone,
  normalizePhones,
  parseVcard,
  phoneKey,
  readVcfFile,
  readySelection,
  sanitizeBulk,
  settleBulk,
} from "./contact-import";
import { fillFromContact } from "./contact-picker";

const card = (...lines: string[]) =>
  ["BEGIN:VCARD", ...lines, "END:VCARD"].join("\r\n");

function ok(text: string) {
  const r = parseVcard(text);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("phone normalisation", () => {
  it.each([
    ["0812-3456-7890", "081234567890"],
    ["+62 812 3456 7890", "+6281234567890"],
    ["0062 812 3456 7890", "+6281234567890"],
    ["+62 (0) 812 3456 7890", "+6281234567890"],
    ["tel:+62-812-3456-7890", "+6281234567890"],
    ["+1 (415) 555-2671", "+14155552671"],
    ["+44 20 7946 0958 x123", "+442079460958"],
    ["(021) 555 0123", "0215550123"],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });
  it.each(["", "abc", "123", "+62", "1234567890123456789", "---"])(
    "rejects %j",
    (raw) => expect(normalizePhone(raw)).toBe(""),
  );
  it("treats Indonesian and international spellings as one number", () => {
    const keys = [
      "081234567890",
      "6281234567890",
      "+62 812-3456-7890",
      "0062 81234567890",
      "+62081234567890",
    ].map(phoneKey);
    expect(new Set(keys).size).toBe(1);
    expect(phoneKey("+1 415 555 2671")).not.toBe(phoneKey("081554552671"));
  });
  it("dedupes and bounds numbers per contact", () => {
    expect(
      normalizePhones(["0812 3456 7890", "+62 812 3456 7890", "0813 9999 000"]),
    ).toEqual(["081234567890", "08139999000"]);
    const many = Array.from(
      { length: 30 },
      (_, i) => `0812000000${String(i).padStart(2, "0")}`,
    );
    expect(normalizePhones(many)).toHaveLength(10);
  });
});

describe("vCard parsing", () => {
  it("reads 3.0 with FN, TEL types and several numbers", () => {
    const r = ok(
      card(
        "VERSION:3.0",
        "FN:Budi Santoso",
        "N:Santoso;Budi;;;",
        "TEL;TYPE=CELL:0812-3456-7890",
        "TEL;TYPE=WORK,VOICE:+62 21 555 0123",
      ),
    );
    expect(r.contacts).toEqual([
      { name: "Budi Santoso", phones: ["081234567890", "+62215550123"] },
    ]);
  });
  it("reads 4.0 with tel: URIs and VALUE parameters", () => {
    const r = ok(
      card(
        "VERSION:4.0",
        "FN:Rani",
        "TEL;VALUE=uri;PREF=1:tel:+62-812-1111-2222",
      ),
    );
    expect(r.contacts[0].phones).toEqual(["+6281211112222"]);
  });
  it("reads 2.1 with bare type tokens and quoted-printable UTF-8", () => {
    const r = ok(
      card(
        "VERSION:2.1",
        "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C3=96zt=C3=BCrk;Ay=C5=9Fe;;;",
        "TEL;CELL;VOICE:0812 5555 6666",
      ),
    );
    expect(r.contacts).toEqual([
      { name: "Ayşe Öztürk", phones: ["081255556666"] },
    ]);
  });
  it("joins quoted-printable soft line breaks", () => {
    const r = ok(
      "BEGIN:VCARD\r\nVERSION:2.1\r\nFN;ENCODING=QUOTED-PRINTABLE:Siti =\r\nAminah\r\nTEL:081200000001\r\nEND:VCARD",
    );
    expect(r.contacts[0].name).toBe("Siti Aminah");
  });
  it("unfolds folded lines (CRLF or LF) and unescapes text", () => {
    const r = ok(
      "BEGIN:VCARD\nVERSION:3.0\nFN:Dewi\\, S.Pd\; M\n .Pd\nTEL:+6281\n 2 3456 7890\nEND:VCARD",
    );
    expect(r.contacts).toEqual([
      { name: "Dewi, S.Pd; M.Pd", phones: ["+6281234567890"] },
    ]);
  });
  it("builds a name from N when FN is absent and honours item groups", () => {
    const r = ok(card("N:Wijaya;Agus;Dwi;Dr.;", "item1.TEL:0812 7777 8888"));
    expect(r.contacts).toEqual([
      { name: "Agus Dwi Wijaya", phones: ["081277778888"] },
    ]);
  });
  it("keeps emoji and non-Latin names", () => {
    const r = ok(card("FN:Kiki 🌸 田中", "TEL:+81 90 1234 5678"));
    expect(r.contacts[0].name).toBe("Kiki 🌸 田中");
  });
  it("keeps contacts without a number or a name for the review list", () => {
    const r = ok(
      card("FN:Tanpa Nomor") +
        "\n" +
        card("TEL:081234567890") +
        "\n" +
        card("FN:Nomor Rusak", "TEL:12"),
    );
    expect(r.contacts).toEqual([
      { name: "Tanpa Nomor", phones: [] },
      { name: "", phones: ["081234567890"] },
      { name: "Nomor Rusak", phones: [] },
    ]);
  });
  it("never reads email, photo or address data", () => {
    const secret = "rahasia@example.com";
    const r = ok(
      card(
        "FN:Budi",
        `EMAIL:${secret}`,
        "ADR:;;Jl. Rahasia 1;;;;",
        "PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQ",
        " AAAAAAAAAAAAAAAAAA",
        "NOTE:catatan pribadi",
        "TEL:081234567890",
      ),
    );
    expect(JSON.stringify(r)).not.toMatch(/rahasia|Jl\.|9j|catatan/i);
    expect(Object.keys(r.contacts[0]).sort()).toEqual(["name", "phones"]);
  });
  it("ignores text outside cards and survives several cards in one file", () => {
    const r = ok(
      "junk\n" +
        card("FN:A", "TEL:081234567890") +
        "\n" +
        card("FN:B", "TEL:081234567891"),
    );
    expect(r.contacts.map((c) => c.name)).toEqual(["A", "B"]);
  });
  it("decodes UTF-16 files with a BOM through readVcfFile", async () => {
    const text = card("FN:Ayşe", "TEL:081234567890");
    const buf = new Uint8Array(2 + text.length * 2);
    buf.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i++) {
      buf[2 + i * 2] = text.charCodeAt(i) & 0xff;
      buf[3 + i * 2] = text.charCodeAt(i) >> 8;
    }
    const r = await readVcfFile(new Blob([buf]));
    expect(r.ok && r.contacts[0].name).toBe("Ayşe");
  });
  it("rejects non-vCard, empty and garbage input with clear messages", () => {
    expect(parseVcard("")).toEqual({ ok: false, error: VCF_ERRORS.empty });
    expect(parseVcard("name,phone\nBudi,0812")).toEqual({
      ok: false,
      error: VCF_ERRORS.invalid,
    });
    expect(parseVcard("<html>BEGIN</html>")).toEqual({
      ok: false,
      error: VCF_ERRORS.invalid,
    });
    expect(parseVcard("BEGIN:VCARD\nVERSION:3.0\nEND:VCARD")).toEqual({
      ok: false,
      error: VCF_ERRORS.none,
    });
    expect(parseVcard("BEGIN:VCARD\nFN:Tidak ditutup\nTEL:0812345678")).toEqual(
      { ok: false, error: VCF_ERRORS.none },
    );
  });
  it("caps the number of contacts and reports truncation", () => {
    const text = Array.from({ length: VCF_MAX_CONTACTS + 5 }, (_, i) =>
      card(`FN:Tamu ${i}`, `TEL:0812${String(10000000 + i)}`),
    ).join("\r\n");
    const r = ok(text);
    expect(r.contacts).toHaveLength(VCF_MAX_CONTACTS);
    expect(r.truncated).toBe(true);
  });
  it("refuses oversized and empty files before reading them", async () => {
    const big = new Blob([new Uint8Array(VCF_MAX_BYTES + 1)]);
    const arrayBuffer = vi.spyOn(big, "arrayBuffer");
    expect(await readVcfFile(big)).toEqual({
      ok: false,
      error: VCF_ERRORS.tooLarge,
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(await readVcfFile(new Blob([]))).toEqual({
      ok: false,
      error: VCF_ERRORS.empty,
    });
  });
  it("reads a file entirely in the browser: no network call is made", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("XMLHttpRequest", fetchSpy);
    vi.stubGlobal("navigator", { sendBeacon: fetchSpy });
    try {
      const r = await readVcfFile(
        new Blob([card("FN:Budi", "TEL:081234567890")]),
      );
      expect(r.ok).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("stays fast on a hostile one-line file", () => {
    const start = Date.now();
    parseVcard("BEGIN:VCARD\n" + "FN:" + "\;".repeat(200_000) + "\nEND:VCARD");
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("review list classification", () => {
  const existing = [
    { name: "Ani", phone: "+62 812-0000-1111" },
    { name: "Tanpa Hp", phone: null },
  ];
  const list = classifyContacts(
    [
      { name: "Budi", phones: ["081200001111"] }, // duplicate (existing)
      { name: "Cici", phones: ["081200002222"] }, // ready
      { name: "Cici", phones: ["081200002222"] }, // repeat in file
      { name: "Dodi", phones: [] }, // no phone
      { name: "tanpa  hp", phones: [] }, // duplicate by name
      { name: "", phones: ["081200003333"] }, // no name
      { name: "Eka", phones: ["081200001111", "081200004444"] }, // one free number
    ],
    existing,
  );
  it("flags duplicates, repeats, missing data clearly", () => {
    expect(list.map((c) => c.status)).toEqual([
      "duplicate",
      "ready",
      "repeat",
      "no-phone",
      "duplicate",
      "no-name",
      "ready",
    ]);
    expect(list[6].taken).toEqual(["081200001111"]);
  });
  it("only ready/no-phone contacts become guests, using the chosen number", () => {
    const sel = new Set(list.map((c) => c.id));
    const ready = readySelection(list, sel, {});
    expect(ready.map((c) => c.name)).toEqual(["Cici", "Dodi", "Eka"]);
    expect(buildBulkItems(ready, {}, 3)).toEqual([
      { name: "Cici", phone: "081200002222", maxGuests: 3 },
      { name: "Dodi", phone: null, maxGuests: 3 },
      { name: "Eka", phone: "081200004444", maxGuests: 3 },
    ]);
  });
  it("requires an explicit number for multi-number contacts", () => {
    const multi = classifyContacts(
      [{ name: "Fani", phones: ["081200005555", "081200006666"] }],
      [],
    );
    const sel = new Set([0]);
    expect(readySelection(multi, sel, {})).toEqual([]);
    expect(readySelection(multi, sel, { 0: "081200006666" })).toHaveLength(1);
    expect(readySelection(multi, sel, { 0: "0899999999" })).toEqual([]);
  });
});

describe("settling a bulk response", () => {
  const cands = classifyContacts(
    ["A", "B", "C", "D", "E"].map((name, i) => ({
      name,
      phones: [`08120000000${i}0`],
    })),
    [],
  );
  it("removes added/skipped, keeps failed and limited ones selected for retry", () => {
    const sel = new Set(cands.map((c) => c.id));
    const out = settleBulk(
      cands,
      cands,
      ["added", "duplicate", "failed", "limit", "invalid"],
      sel,
    );
    expect(out.summary).toEqual({ added: 1, skipped: 3, failed: 1 });
    expect(out.candidates.map((c) => c.name)).toEqual(["C", "D"]);
    expect([...out.selected]).toEqual([2, 3]);
  });
  it("treats a short response as failure, never as success", () => {
    const out = settleBulk(
      cands,
      cands,
      ["added"],
      new Set(cands.map((c) => c.id)),
    );
    expect(out.summary).toEqual({ added: 1, skipped: 0, failed: 4 });
  });
});

describe("server-side bulk sanitising", () => {
  it("rejects non-arrays, empty and oversized batches", () => {
    expect(sanitizeBulk(undefined, 10)).toBeNull();
    expect(sanitizeBulk("x", 10)).toBeNull();
    expect(sanitizeBulk([], 10)).toBeNull();
    expect(
      sanitizeBulk(Array(BULK_GUEST_MAX + 1).fill({ name: "A" }), 10),
    ).toBeNull();
    expect(
      sanitizeBulk(Array(BULK_GUEST_MAX).fill({ name: "A" }), 10),
    ).toHaveLength(BULK_GUEST_MAX);
  });
  it("cleans every field and caps the party size to the caller's maximum", () => {
    const [a, b, c, d] = sanitizeBulk(
      [
        {
          name: "  Budi\u0000\n ",
          phone: "0812-3456-7890",
          maxGuests: 99,
          group: "x".repeat(300),
        },
        { name: "Cici", phone: "abc" }, // phone present but invalid -> unusable item
        null,
        { name: 42, phone: {}, maxGuests: "oops" },
      ],
      10,
    )!;
    expect(a).toEqual({
      name: "Budi",
      phone: "081234567890",
      group: "x".repeat(100),
      maxGuests: 10,
    });
    expect(b.name).toBe("");
    expect(c.name).toBe("");
    expect(d).toEqual({ name: "", phone: null, group: null, maxGuests: 2 });
    expect(sanitizeBulk([{ name: "A", maxGuests: 8 }], 5)![0].maxGuests).toBe(
      5,
    );
  });
  it("finds duplicates against existing guests and earlier items", () => {
    const items = sanitizeBulk(
      [
        { name: "A", phone: "081200001111" },
        { name: "B", phone: "+62 812 0000 1111" },
        { name: "C", phone: "081200002222" },
        { name: "C2", phone: "081200002222" },
        { name: "Nomor kosong" },
        { name: "nomor  KOSONG" },
        { name: "" },
      ],
      10,
    )!;
    expect(
      findBulkDuplicates(items, [{ name: "X", phone: "+6281200001111" }]),
    ).toEqual([true, true, false, true, false, true, false]);
  });
});

describe("native picker fill", () => {
  it("replaces every field from the new contact only", () => {
    expect(fillFromContact({ name: "", phones: [] }, [])).toEqual({
      kind: "fill",
      name: "",
      phone: "",
      phones: [],
    });
    expect(fillFromContact({ name: "Budi", phones: [] }, [])).toEqual({
      kind: "fill",
      name: "Budi",
      phone: "",
      phones: [],
    });
    expect(fillFromContact({ name: "", phones: ["0812345678"] }, [])).toEqual({
      kind: "fill",
      name: "",
      phone: "0812345678",
      phones: [],
    });
  });
  it("asks for a choice with several numbers and leaves the form for a duplicate", () => {
    expect(
      fillFromContact(
        { name: "Budi", phones: ["0812345678", "0813456789"] },
        [],
      ),
    ).toEqual({
      kind: "fill",
      name: "Budi",
      phone: "",
      phones: ["0812345678", "0813456789"],
    });
    expect(
      fillFromContact({ name: "Budi", phones: ["0812345678"] }, [
        "+62 812345678",
      ]),
    ).toEqual({ kind: "duplicate" });
  });
});

describe("duplicate tracker", () => {
  it("only remembers items that were actually saved", () => {
    const t = duplicateTracker([{ name: "X", phone: "081200001111" }]);
    const a = { name: "A", phone: "081200002222", group: null, maxGuests: 2 };
    expect(t.has(a)).toBe(false);
    expect(t.has(a)).toBe(false); // a failed save is never added, so a retry is not a duplicate
    t.add(a);
    expect(t.has({ ...a, phone: "+62 812 0000 2222" })).toBe(true);
    expect(
      t.has({ name: "Z", phone: "081200001111", group: null, maxGuests: 2 }),
    ).toBe(true);
  });
});

describe("bulk category on import", () => {
  it("attaches one category to every item only when set", () => {
    const ready = classifyContacts(
      [{ name: "A", phones: ["081200001111"] }],
      [],
    );
    expect(buildBulkItems(ready, {}, 2, "Teman Kantor")).toEqual([
      { name: "A", phone: "081200001111", maxGuests: 2, group: "Teman Kantor" },
    ]);
    expect(buildBulkItems(ready, {}, 2, "")).toEqual([
      { name: "A", phone: "081200001111", maxGuests: 2 },
    ]);
    expect(buildBulkItems(ready, {}, 2)[0]).not.toHaveProperty("group");
  });
});
