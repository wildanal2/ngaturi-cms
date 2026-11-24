import { phoneKey } from "./contact-import";

/**
 * Pure helpers shared by the owner and delegate guest lists: category
 * normalisation, search/filter, pagination and stats. No browser or server APIs.
 */
export const GUEST_PAGE_SIZE = 25;
export const CATEGORY_MAX = 100;

export interface ListGuest {
  id: string;
  guestName: string;
  guestGroup: string | null;
  slugToken: string;
  maxGuests: number;
  whatsappPhone: string | null;
  isSent: boolean;
  opened: boolean;
}

/** Collapses whitespace and control characters; "" means no category. */
export function normalizeCategory(raw: unknown): string {
  return (typeof raw === "string" ? raw : "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CATEGORY_MAX)
    .trim();
}

export function categoryKey(raw: unknown): string {
  return normalizeCategory(raw).normalize("NFKC").toLowerCase();
}

/**
 * Unique categories of the given guests, one spelling per case-insensitive key:
 * the most used spelling wins (ties: code-unit order, so capitalised first), so old data keeps its
 * capitalisation. Sorted for stable display.
 */
export function categoryOptions(
  groups: readonly (string | null | undefined)[],
): string[] {
  const spellings = new Map<string, Map<string, number>>();
  for (const raw of groups) {
    const name = normalizeCategory(raw);
    if (!name) continue;
    const key = categoryKey(name);
    const counts = spellings.get(key) ?? new Map<string, number>();
    counts.set(name, (counts.get(name) ?? 0) + 1);
    spellings.set(key, counts);
  }
  return [...spellings.values()]
    .map(
      (counts) =>
        [...counts.entries()].sort(
          // Most used first; a tie falls back to code-unit order so the client
          // and the server pick the same spelling whatever the row order.
          (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
        )[0][0],
    )
    .sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }));
}

/** Category to store: an existing spelling when one matches, else the cleaned input. */
export function canonicalCategory(
  raw: unknown,
  known: readonly (string | null | undefined)[],
): string | null {
  const name = normalizeCategory(raw);
  if (!name) return null;
  const key = categoryKey(name);
  return categoryOptions(known).find((c) => categoryKey(c) === key) ?? name;
}

/**
 * Applies `canonicalCategory` across a batch so "teman kantor" and "Teman
 * Kantor" in the same import end up as one spelling.
 */
export function canonicalizeGroups<T extends { group: string | null }>(
  items: T[],
  known: readonly (string | null | undefined)[],
): T[] {
  const pool = [...known];
  return items.map((item) => {
    const group = canonicalCategory(item.group, pool);
    if (group) pool.push(group);
    return { ...item, group };
  });
}

/* ------------------------------ filtering ------------------------------ */

export type CategoryFilter = "all" | "none" | `cat:${string}`;
export type StatusFilter = "all" | "yes" | "no";

export interface GuestFilters {
  query: string;
  category: CategoryFilter;
  sent: StatusFilter;
  opened: StatusFilter;
}

export const DEFAULT_FILTERS: GuestFilters = {
  query: "",
  category: "all",
  sent: "all",
  opened: "all",
};

export const categoryFilterFor = (category: string): CategoryFilter =>
  `cat:${categoryKey(category)}`;

export function activeFilterCount(f: GuestFilters): number {
  return (
    (f.query.trim() ? 1 : 0) +
    (f.category !== "all" ? 1 : 0) +
    (f.sent !== "all" ? 1 : 0) +
    (f.opened !== "all" ? 1 : 0)
  );
}

const fold = (value: string) => value.normalize("NFKC").toLowerCase();

function matchesQuery(guest: ListGuest, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  if (fold(guest.guestName).includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  if (digits.length < 3 || !guest.whatsappPhone) return false;
  const own = guest.whatsappPhone.replace(/\D/g, "");
  const key = phoneKey(guest.whatsappPhone);
  const wanted = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return own.includes(digits) || key.includes(wanted);
}

export function filterGuests<T extends ListGuest>(
  guests: readonly T[],
  f: GuestFilters,
): T[] {
  return guests.filter((g) => {
    if (!matchesQuery(g, f.query)) return false;
    if (f.category === "none" && normalizeCategory(g.guestGroup)) return false;
    if (
      f.category.startsWith("cat:") &&
      `cat:${categoryKey(g.guestGroup)}` !== f.category
    )
      return false;
    if (f.sent !== "all" && g.isSent !== (f.sent === "yes")) return false;
    if (f.opened !== "all" && g.opened !== (f.opened === "yes")) return false;
    return true;
  });
}

/* ----------------------------- pagination ----------------------------- */

export function paginate<T>(
  items: readonly T[],
  page: number,
  size = GUEST_PAGE_SIZE,
) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    pageCount,
    total: items.length,
  };
}

export function guestStats(guests: readonly ListGuest[]) {
  return {
    total: guests.length,
    sent: guests.filter((g) => g.isSent).length,
    opened: guests.filter((g) => g.opened).length,
  };
}

/** Why a name can no longer be edited, or null when it still can. */
export const NAME_LOCKED_MESSAGE =
  "Nama tidak dapat diubah setelah undangan dikirim atau dibuka.";
export const nameLocked = (g: Pick<ListGuest, "isSent" | "opened">) =>
  g.isSent || g.opened;
