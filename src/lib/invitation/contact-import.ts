/**
 * Pure helpers for importing guests from the device address book (native
 * picker or a .vcf file). Everything runs in the browser except the bulk
 * sanitiser, which the server re-runs on whatever the client sends. Only the
 * name and phone numbers are ever read; email, photo and address lines in a
 * vCard are skipped without being parsed.
 */

export const VCF_MAX_BYTES = 2 * 1024 * 1024;
export const VCF_MAX_CONTACTS = 2000;
export const VCF_MAX_PHONES_PER_CONTACT = 10;
/**
 * Upper bound of contacts written by ONE import confirmation, enforced again on
 * the server. Not the delegate quota: that is DELEGATE_MAX_GUESTS (total per
 * invitation).
 */
export const BULK_GUEST_MAX = 100;
const NAME_MAX = 100;
const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

/** Comparison key. Indonesian 08…, 62…, +62… and 0062… all collapse to 62…. */
export function phoneKey(phone: string): string {
  let digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("620")) digits = `62${digits.slice(3)}`;
  return digits.replace(/^0/, "62");
}

/**
 * Cleans a phone for storage: digits with an optional leading "+", extensions
 * and separators removed. Returns "" when it cannot be a phone number.
 */
export function normalizePhone(raw: string): string {
  let value = raw.trim().replace(/^tel:/i, "");
  value = value.replace(/\s*(?:;|,|ext\.?|x|#)\s*\d{1,6}$/i, "");
  const international = value.startsWith("+") || value.startsWith("00");
  let digits = value.replace(/\D/g, "");
  if (value.startsWith("00")) digits = digits.slice(2);
  if (international && digits.startsWith("620"))
    digits = `62${digits.slice(3)}`;
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS)
    return "";
  return international ? `+${digits}` : digits;
}

export function normalizePhones(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const phone = normalizePhone(value);
    const key = phone && phoneKey(phone);
    if (!phone || seen.has(key)) continue;
    seen.add(key);
    out.push(phone);
    if (out.length >= VCF_MAX_PHONES_PER_CONTACT) break;
  }
  return out;
}

export interface ImportedContact {
  name: string;
  phones: string[];
}

export type VcfResult =
  | {
      ok: true;
      contacts: ImportedContact[];
      /** Cards past VCF_MAX_CONTACTS that were not read. */
      truncated: boolean;
    }
  | { ok: false; error: string };

export const VCF_ERRORS = {
  tooLarge: "File kontak terlalu besar (maksimal 2 MB).",
  empty: "File kosong.",
  invalid:
    "File ini bukan vCard (.vcf) yang valid. Ekspor kontak dari aplikasi Kontak sebagai .vcf lalu coba lagi.",
  none: "Tidak ada kontak yang dapat dibaca dalam file ini.",
} as const;

function decodeBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
}

function decodeQuotedPrintable(value: string, charset: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const hex = value.slice(i + 1, i + 3);
    if (value[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(value[i]));
    }
  }
  try {
    return new TextDecoder(charset).decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
}

function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, c: string) =>
    c === "n" || c === "N" ? " " : c,
  );
}

/** Splits on unescaped semicolons. */
function splitStructured(value: string): string[] {
  return value.split(/(?<!\\);/).map((part) => unescapeText(part).trim());
}

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n?/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    const prev = lines[lines.length - 1];
    if (prev !== undefined && /^[ \t]/.test(line)) {
      lines[lines.length - 1] = prev + line.slice(1);
    } else if (
      prev !== undefined &&
      /^[^:]*QUOTED-PRINTABLE/i.test(prev) &&
      prev.endsWith("=")
    ) {
      // vCard 2.1 soft line break inside a quoted-printable value.
      lines[lines.length - 1] = prev.slice(0, -1) + line;
    } else {
      lines.push(line);
    }
  }
  return lines;
}

export function parseVcard(text: string): VcfResult {
  if (!text.trim()) return { ok: false, error: VCF_ERRORS.empty };
  if (!/^\s*BEGIN:VCARD/im.test(text))
    return { ok: false, error: VCF_ERRORS.invalid };

  const contacts: ImportedContact[] = [];
  let truncated = false;
  let card: { fn: string; n: string; tel: string[] } | null = null;

  for (const line of unfold(text)) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const head = line.slice(0, colon);
    const upperHead = head.toUpperCase();
    const upperValue = line
      .slice(colon + 1)
      .trim()
      .toUpperCase();
    if (upperHead === "BEGIN" && upperValue === "VCARD") {
      card = { fn: "", n: "", tel: [] };
      continue;
    }
    if (upperHead === "END" && upperValue === "VCARD") {
      if (card) {
        const name = card.fn || card.n;
        const phones = normalizePhones(card.tel);
        if (name || phones.length) {
          if (contacts.length >= VCF_MAX_CONTACTS) truncated = true;
          else contacts.push({ name: name.slice(0, NAME_MAX), phones });
        }
      }
      card = null;
      continue;
    }
    if (!card) continue;

    // Strip an optional "item1." group, then split parameters from the name.
    const [rawName, ...params] = head.replace(/^[\w-]+\./, "").split(";");
    const prop = rawName.toUpperCase();
    if (prop !== "FN" && prop !== "N" && prop !== "TEL") continue;

    let value = line.slice(colon + 1);
    const paramText = params.join(";").toUpperCase();
    if (/ENCODING=QUOTED-PRINTABLE|(^|;)QUOTED-PRINTABLE/.test(paramText)) {
      const charset = /CHARSET=([\w-]+)/.exec(paramText)?.[1] ?? "UTF-8";
      value = decodeQuotedPrintable(value, charset);
    }

    if (prop === "TEL") {
      card.tel.push(unescapeText(value).trim());
    } else if (prop === "FN") {
      if (!card.fn) card.fn = unescapeText(value).trim();
    } else if (!card.n) {
      // N = family;given;additional;prefix;suffix
      const [family = "", given = "", additional = ""] = splitStructured(value);
      card.n = [given, additional, family].filter(Boolean).join(" ");
    }
  }

  if (!contacts.length) return { ok: false, error: VCF_ERRORS.none };
  return { ok: true, contacts, truncated };
}

/** Reads a File/Blob in the browser. The content never leaves the device. */
export async function readVcfFile(file: Blob): Promise<VcfResult> {
  if (file.size > VCF_MAX_BYTES)
    return { ok: false, error: VCF_ERRORS.tooLarge };
  if (file.size === 0) return { ok: false, error: VCF_ERRORS.empty };
  try {
    return parseVcard(decodeBytes(new Uint8Array(await file.arrayBuffer())));
  } catch {
    return { ok: false, error: VCF_ERRORS.invalid };
  }
}

export type CandidateStatus =
  "ready" | "no-phone" | "no-name" | "duplicate" | "repeat";

export interface Candidate {
  id: number;
  name: string;
  phones: string[];
  status: CandidateStatus;
  /** Phones already used by an existing guest, flagged per number. */
  taken: string[];
}

/**
 * Classifies each contact against the guests that already exist. A contact is
 * a duplicate when every number it has is taken; it is a "repeat" when the same
 * name+number appeared earlier in the same file.
 */
export function classifyContacts(
  contacts: ImportedContact[],
  existing: { name?: string | null; phone: string | null }[],
): Candidate[] {
  const takenKeys = new Set(
    existing.map((g) => (g.phone ? phoneKey(g.phone) : "")).filter(Boolean),
  );
  const takenNames = new Set(
    existing.filter((g) => !g.phone && g.name).map((g) => nameKey(g.name!)),
  );
  const seen = new Set<string>();
  return contacts.map((contact, id) => {
    const taken = contact.phones.filter((p) => takenKeys.has(phoneKey(p)));
    const free = contact.phones.filter((p) => !takenKeys.has(phoneKey(p)));
    const fingerprint = `${nameKey(contact.name)}|${contact.phones.map(phoneKey).sort().join(",")}`;
    let status: CandidateStatus = "ready";
    if (!contact.name.trim()) status = "no-name";
    else if (contact.phones.length && !free.length) status = "duplicate";
    else if (!contact.phones.length && takenNames.has(nameKey(contact.name)))
      status = "duplicate";
    else if (seen.has(fingerprint)) status = "repeat";
    else if (!contact.phones.length) status = "no-phone";
    seen.add(fingerprint);
    return { id, name: contact.name, phones: contact.phones, status, taken };
  });
}

function nameKey(name: string): string {
  return name.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------- bulk request contract ------------------------- */

export interface BulkGuestInput {
  name: string;
  phone: string | null;
  group?: string | null;
  maxGuests?: number;
}

export type BulkItemStatus =
  "added" | "duplicate" | "invalid" | "limit" | "failed";

export type BulkResult =
  | {
      ok: true;
      /** Same order and length as the request. */
      statuses: BulkItemStatus[];
      added: number;
    }
  /** The whole request was refused (permission, size, rate limit). */
  | { ok: false; error: string };

export interface CleanBulkItem {
  name: string;
  phone: string | null;
  group: string | null;
  maxGuests: number;
}

/**
 * Server-side normalisation of untrusted bulk input. Never throws: anything
 * that is not a usable guest comes back as `null` so statuses stay aligned
 * with the request. `maxParty` differs per caller.
 */
export function sanitizeBulk(
  input: unknown,
  maxParty: number,
): CleanBulkItem[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  if (input.length > BULK_GUEST_MAX) return null;
  return input.map((raw): CleanBulkItem => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    const name =
      typeof item.name === "string"
        ? item.name
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .trim()
            .slice(0, NAME_MAX)
        : "";
    const phoneRaw = typeof item.phone === "string" ? item.phone.trim() : "";
    const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
    const group =
      typeof item.group === "string"
        ? item.group
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .trim()
            .slice(0, 100)
        : "";
    const party = Math.floor(Number(item.maxGuests));
    return {
      // An unusable name or a phone that is present but invalid marks the item.
      name: phoneRaw && !phone ? "" : name,
      phone: phone || null,
      group: group || null,
      maxGuests: Math.min(maxParty, Math.max(1, party || 2)),
    };
  });
}

/**
 * Duplicate lookup that only remembers guests that really exist. Call `add`
 * after a successful save so a failed insert never shadows a later retry.
 */
export function duplicateTracker(
  existing: { name?: string | null; phone: string | null }[],
) {
  const keys = new Set(
    existing.map((g) => (g.phone ? phoneKey(g.phone) : "")).filter(Boolean),
  );
  const names = new Set(
    existing.filter((g) => !g.phone && g.name).map((g) => nameKey(g.name!)),
  );
  return {
    has: (item: CleanBulkItem) =>
      item.phone
        ? keys.has(phoneKey(item.phone))
        : names.has(nameKey(item.name)),
    add: (item: CleanBulkItem) => {
      if (item.phone) keys.add(phoneKey(item.phone));
      else names.add(nameKey(item.name));
    },
  };
}

/* ------------------------ review-list state helpers ------------------------ */

/** Whether a candidate may be ticked at all. */
export function isSelectable(c: Candidate): boolean {
  return c.status === "ready" || c.status === "no-phone";
}

/** The number to store for a candidate: the explicit choice, else a single free number. */
export function chosenPhone(
  c: Candidate,
  choice: Record<number, string>,
): string | null {
  const free = c.phones.filter((p) => !c.taken.includes(p));
  const picked = choice[c.id];
  if (picked && free.includes(picked)) return picked;
  return free.length === 1 ? free[0] : null;
}

/** A contact with several free numbers needs an explicit choice before it counts. */
export function needsPhoneChoice(
  c: Candidate,
  choice: Record<number, string>,
): boolean {
  const free = c.phones.filter((p) => !c.taken.includes(p));
  return free.length > 1 && !chosenPhone(c, choice);
}

/** Selected, selectable candidates that are ready to be sent, in list order. */
export function readySelection(
  candidates: Candidate[],
  selected: ReadonlySet<number>,
  choice: Record<number, string>,
): Candidate[] {
  return candidates.filter(
    (c) =>
      selected.has(c.id) && isSelectable(c) && !needsPhoneChoice(c, choice),
  );
}

export function buildBulkItems(
  ready: Candidate[],
  choice: Record<number, string>,
  maxGuests: number,
  group?: string | null,
): BulkGuestInput[] {
  return ready.map((c) => ({
    name: c.name,
    phone: chosenPhone(c, choice),
    maxGuests,
    ...(group ? { group } : {}),
  }));
}

export interface BulkSummary {
  added: number;
  skipped: number;
  failed: number;
}

/**
 * Folds server statuses back into the list: added and duplicate contacts leave
 * the review list, everything else stays selected so Retry resends only those.
 */
export function settleBulk(
  candidates: Candidate[],
  sent: Candidate[],
  statuses: BulkItemStatus[],
  selected: ReadonlySet<number>,
): { candidates: Candidate[]; selected: Set<number>; summary: BulkSummary } {
  const summary: BulkSummary = { added: 0, skipped: 0, failed: 0 };
  const done = new Set<number>();
  const next = new Set(selected);
  sent.forEach((c, i) => {
    const status = statuses[i] ?? "failed";
    if (status === "added") {
      summary.added++;
      done.add(c.id);
    } else if (status === "duplicate" || status === "invalid") {
      summary.skipped++;
      done.add(c.id);
    } else if (status === "limit") {
      summary.skipped++;
    } else {
      summary.failed++;
    }
  });
  done.forEach((id) => next.delete(id));
  return {
    candidates: candidates.filter((c) => !done.has(c.id)),
    selected: next,
    summary,
  };
}
