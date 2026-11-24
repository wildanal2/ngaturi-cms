import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  GUEST_PAGE_SIZE,
  activeFilterCount,
  canonicalCategory,
  canonicalizeGroups,
  categoryFilterFor,
  categoryOptions,
  filterGuests,
  guestStats,
  nameLocked,
  normalizeCategory,
  paginate,
  type GuestFilters,
  type ListGuest,
} from "./guest-list";

const g = (over: Partial<ListGuest> & { id: string }): ListGuest => ({
  guestName: over.id,
  guestGroup: null,
  slugToken: `tok-${over.id}`,
  maxGuests: 2,
  whatsappPhone: null,
  isSent: false,
  opened: false,
  ...over,
});
const f = (over: Partial<GuestFilters>): GuestFilters => ({
  ...DEFAULT_FILTERS,
  ...over,
});

describe("categories", () => {
  it("normalises whitespace, control characters and length", () => {
    expect(normalizeCategory("  Teman \t  Kantor\n")).toBe("Teman Kantor");
    expect(normalizeCategory("A\u0000B")).toBe("A B");
    expect(normalizeCategory(undefined)).toBe("");
    expect(normalizeCategory(42)).toBe("");
    expect(normalizeCategory("x".repeat(300))).toHaveLength(100);
  });
  it("lists one spelling per case-insensitive key, most used wins, legacy kept", () => {
    expect(
      categoryOptions([
        "Teman Kantor",
        "teman kantor",
        "Teman  Kantor",
        null,
        "",
        "keluarga",
        "Keluarga",
        "keluarga",
      ]),
    ).toEqual(["keluarga", "Teman Kantor"]);
    expect(categoryOptions(["b", "A", "c"])).toEqual(["A", "b", "c"]);
    // A tie is resolved the same way whatever the row order.
    expect(categoryOptions(["teman kantor", "Teman Kantor"])).toEqual([
      "Teman Kantor",
    ]);
    expect(categoryOptions(["Teman Kantor", "teman kantor"])).toEqual([
      "Teman Kantor",
    ]);
    expect(categoryOptions([])).toEqual([]);
  });
  it("stores the existing spelling for a case-insensitive match, else the cleaned input", () => {
    const known = ["Teman Kantor", "Keluarga"];
    expect(canonicalCategory("  teman   kantor ", known)).toBe("Teman Kantor");
    expect(canonicalCategory("KELUARGA", known)).toBe("Keluarga");
    expect(canonicalCategory("Tetangga", known)).toBe("Tetangga");
    expect(canonicalCategory("   ", known)).toBeNull();
    expect(canonicalCategory(null, known)).toBeNull();
  });
  it("keeps one spelling for new categories inside the same batch", () => {
    const out = canonicalizeGroups(
      [
        { group: "teman lama" },
        { group: "Teman Lama" },
        { group: null },
        { group: "KELUARGA" },
      ],
      ["Keluarga"],
    );
    expect(out.map((i) => i.group)).toEqual([
      "teman lama",
      "teman lama",
      null,
      "Keluarga",
    ]);
  });
});

describe("search and filters", () => {
  const guests = [
    g({
      id: "1",
      guestName: "Budi Santoso",
      whatsappPhone: "0812-3456-7001",
      guestGroup: "Teman Kantor",
      isSent: true,
    }),
    g({
      id: "2",
      guestName: "Ayşe Öztürk",
      whatsappPhone: "+62 812 3456 7002",
      guestGroup: "teman kantor",
      isSent: true,
      opened: true,
    }),
    g({ id: "3", guestName: "Citra", guestGroup: "Keluarga", opened: true }),
    g({ id: "4", guestName: "Dodi", whatsappPhone: "+1 415 555 2671" }),
  ];
  const ids = (x: ListGuest[]) => x.map((i) => i.id);

  it("searches names case-insensitively and numbers across 08…/62…/+62 formats", () => {
    expect(ids(filterGuests(guests, f({ query: "budi" })))).toEqual(["1"]);
    expect(ids(filterGuests(guests, f({ query: "ÖZTÜRK" })))).toEqual(["2"]);
    expect(ids(filterGuests(guests, f({ query: "081234567002" })))).toEqual([
      "2",
    ]);
    expect(
      ids(filterGuests(guests, f({ query: "+62 812 3456 7001" }))),
    ).toEqual(["1"]);
    expect(ids(filterGuests(guests, f({ query: "6281234567001" })))).toEqual([
      "1",
    ]);
    expect(ids(filterGuests(guests, f({ query: "415 555" })))).toEqual(["4"]);
    expect(ids(filterGuests(guests, f({ query: "12" })))).toEqual([]); // short digits are not a phone search
    expect(filterGuests(guests, f({ query: "tidak ada" }))).toEqual([]);
  });
  it("filters by category, treating spellings as one and 'none' as uncategorised", () => {
    expect(
      ids(
        filterGuests(
          guests,
          f({ category: categoryFilterFor("Teman Kantor") }),
        ),
      ),
    ).toEqual(["1", "2"]);
    expect(ids(filterGuests(guests, f({ category: "none" })))).toEqual(["4"]);
    expect(
      filterGuests(guests, f({ category: categoryFilterFor("Tetangga") })),
    ).toEqual([]);
  });
  it("covers every sent/opened combination independently", () => {
    expect(ids(filterGuests(guests, f({ sent: "yes", opened: "no" })))).toEqual(
      ["1"],
    );
    expect(
      ids(filterGuests(guests, f({ sent: "yes", opened: "yes" }))),
    ).toEqual(["2"]);
    expect(ids(filterGuests(guests, f({ sent: "no", opened: "yes" })))).toEqual(
      ["3"],
    ); // opened without a recorded send
    expect(ids(filterGuests(guests, f({ sent: "no", opened: "no" })))).toEqual([
      "4",
    ]);
  });
  it("combines all filters with AND", () => {
    expect(
      ids(
        filterGuests(
          guests,
          f({
            query: "budi",
            category: categoryFilterFor("teman kantor"),
            sent: "yes",
            opened: "no",
          }),
        ),
      ),
    ).toEqual(["1"]);
    expect(
      filterGuests(
        guests,
        f({ query: "budi", category: categoryFilterFor("Keluarga") }),
      ),
    ).toEqual([]);
  });
  it("keeps the original order and counts active filters", () => {
    expect(ids(filterGuests(guests, DEFAULT_FILTERS))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount(f({ query: " x ", sent: "no", category: "none" })),
    ).toBe(3);
  });
  it("computes stats and the name lock from independent flags", () => {
    expect(guestStats(guests)).toEqual({ total: 4, sent: 2, opened: 2 });
    expect(nameLocked({ isSent: false, opened: false })).toBe(false);
    expect(nameLocked({ isSent: true, opened: false })).toBe(true);
    expect(nameLocked({ isSent: false, opened: true })).toBe(true);
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 60 }, (_, i) => i);
  it("defaults to 25 per page and keeps order", () => {
    const p = paginate(items, 1);
    expect(GUEST_PAGE_SIZE).toBe(25);
    expect(p).toMatchObject({ page: 1, pageCount: 3, total: 60 });
    expect(p.items).toEqual(items.slice(0, 25));
    expect(paginate(items, 3).items).toEqual(items.slice(50));
  });
  it("clamps the page after the list shrinks or on bad input", () => {
    expect(paginate(items.slice(0, 26), 5)).toMatchObject({
      page: 2,
      pageCount: 2,
    });
    expect(paginate(items.slice(0, 25), 2)).toMatchObject({
      page: 1,
      pageCount: 1,
    });
    expect(paginate([], 3)).toMatchObject({ page: 1, pageCount: 1, items: [] });
    expect(paginate(items, Number.NaN).page).toBe(1);
    expect(paginate(items, -4).page).toBe(1);
  });
  it("paginates the filtered result, not the whole list", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      g({ id: String(i), isSent: i % 3 === 0 }),
    );
    const filtered = filterGuests(many, f({ sent: "yes" }));
    expect(filtered).toHaveLength(20);
    expect(paginate(filtered, 1)).toMatchObject({ pageCount: 1, total: 20 });
  });
});
