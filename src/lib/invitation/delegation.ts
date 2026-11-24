import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { guestInvites, invitations, rsvpResponses } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";
import { trustedClientIp } from "@/lib/security/request-metadata";
import {
  BULK_GUEST_MAX,
  sanitizeBulk,
  type BulkResult,
  type CleanBulkItem,
} from "./contact-import";
import {
  NAME_LOCKED_MESSAGE,
  canonicalCategory,
} from "./guest-list";
import { hasProFeatures } from "./entitlement";
import { insertGuestsLocked, lockInvitation, type Tx } from "./guest-writer";
import {
  defaultWhatsappTemplate,
  readWhatsappTemplate,
  whatsappMessageKey,
} from "./whatsapp-template-store";
import { whatsappCoupleNames, type WhatsappTemplate } from "./whatsapp-message";

/**
 * Delegated guest management for a customer without a Ngaturi account.
 *
 * The capability is a 256-bit random bearer token. Only its SHA-256 hash is
 * stored (Redis, no schema change). Scope is fixed: create NEW personal guest
 * links and read name/status/count of guests created through delegation.
 * Delegated guests are recognisable by their `dg` + 10 char personal token;
 * owner-created tokens are exactly 10 chars, so existing guests stay invisible.
 */
export const DELEGATE_SCOPES = ["guests:create", "rsvp:read"] as const;
export const DELEGATE_DEFAULT_DAYS = 7;
export const DELEGATE_MAX_DAYS = 30;
/** Total delegated guests per invitation (quota is not WhatsApp messages sent). */
export const DELEGATE_MAX_GUESTS = 999;
export const DELEGATE_GUEST_MAX_PARTY = 10;
export const DELEGATE_TOKEN_PREFIX = "dg";
const DAY = 86_400;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DelegateFailure =
  "invalid" | "expired" | "revoked" | "rate_limited" | "unavailable";

interface GrantRecord {
  v: 1;
  invitationId: string;
  ownerId: string;
  scopes: readonly string[];
  createdAt: string;
  expiresAt: string;
  revoked?: true;
}

type Invitation = typeof invitations.$inferSelect;

const grantKey = (hash: string) => `ngaturi:delegate:grant:v1:${hash}`;
const activeKey = (invitationId: string) =>
  `ngaturi:delegate:active:v1:${invitationId}`;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isDelegatedGuestToken(token: string): boolean {
  return /^dg[a-km-np-z2-9]{10}$/.test(token);
}

export async function hashDelegateToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function parsePointer(raw: string | null): { hash?: string } | null {
  try {
    const p = raw ? JSON.parse(raw) : null;
    return p && typeof p === "object" ? p : null;
  } catch {
    return null; // corrupt pointer: treated as absent so it can be replaced
  }
}

function parseRecord(raw: string | null): GrantRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as GrantRecord;
    return r?.v === 1 &&
      isUuid(r.invitationId) &&
      typeof r.ownerId === "string" &&
      Number.isFinite(Date.parse(r.expiresAt))
      ? r
      : null;
  } catch {
    return null;
  }
}

async function callerKey(): Promise<string> {
  try {
    return trustedClientIp(await headers()) ?? "noip";
  } catch {
    return "noip";
  }
}

export function delegateUrl(token: string): string {
  return `${env.BETTER_AUTH_URL}/kelola-tamu/${token}`;
}

/* ------------------------------ owner side ------------------------------ */

export interface DelegateStatus {
  active: boolean;
  createdAt: string | null;
  expiresAt: string | null;
  /** Redis could not be read: "inactive" would be a guess, so say so. */
  unavailable?: true;
}

export async function readDelegateStatus(
  invitationId: string,
): Promise<DelegateStatus> {
  const none = { active: false, createdAt: null, expiresAt: null };
  try {
    const pointer = parsePointer(await redis.get(activeKey(invitationId)));
    if (!pointer?.hash) return none;
    const record = parseRecord(await redis.get(grantKey(pointer.hash)));
    if (
      !record ||
      record.revoked ||
      record.invitationId !== invitationId ||
      Date.parse(record.expiresAt) <= Date.now()
    )
      return none;
    return {
      active: true,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  } catch {
    return { ...none, unavailable: true };
  }
}

async function tombstone(hash: string) {
  const record = parseRecord(await redis.get(grantKey(hash)));
  if (record && !record.revoked)
    await redis.set(
      grantKey(hash),
      JSON.stringify({ ...record, revoked: true }),
      DAY,
    );
}

async function revokeActive(invitationId: string) {
  const pointer = parsePointer(await redis.get(activeKey(invitationId)));
  if (pointer?.hash) await tombstone(pointer.hash);
  await redis.delete(activeKey(invitationId));
}

export function clampDelegateDays(days: unknown): number {
  const n = Number(days);
  if (!Number.isFinite(n)) return DELEGATE_DEFAULT_DAYS;
  return Math.min(DELEGATE_MAX_DAYS, Math.max(1, Math.floor(n)));
}

/** Caller must already have proven ownership of `inv`. */
export async function issueDelegateGrant(
  inv: Pick<Invitation, "id" | "userId" | "expiresAt">,
  days: unknown,
  now = new Date(),
): Promise<
  | { ok: true; token: string; url: string; expiresAt: string }
  | { ok: false; error: string }
> {
  if (inv.expiresAt && inv.expiresAt <= now)
    return { ok: false, error: "Undangan sudah kedaluwarsa." };
  const lock = `ngaturi:delegate:lock:${inv.id}`;
  let locked = true;
  try {
    if (!(await rateLimit(`delegate:issue:${inv.userId}`, 10, 3600)))
      return {
        ok: false,
        error: "Terlalu banyak permintaan. Coba lagi nanti.",
      };
    // Serialises concurrent creates so no orphan (unrevocable) grant remains.
    if ((await redis.incrementWithTtl(lock, 5)) > 1) {
      locked = false;
      return { ok: false, error: "Permintaan sedang diproses. Coba lagi." };
    }
    const ttlMs = Math.min(
      clampDelegateDays(days) * DAY * 1000,
      inv.expiresAt ? inv.expiresAt.getTime() - now.getTime() : Infinity,
    );
    const expiresAt = new Date(now.getTime() + ttlMs);
    const token = newToken();
    const hash = await hashDelegateToken(token);
    await revokeActive(inv.id);
    const record: GrantRecord = {
      v: 1,
      invitationId: inv.id,
      ownerId: inv.userId,
      scopes: DELEGATE_SCOPES,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    const ttl = Math.max(1, Math.ceil(ttlMs / 1000));
    await redis.set(grantKey(hash), JSON.stringify(record), ttl);
    await redis.set(activeKey(inv.id), JSON.stringify({ hash }), ttl);
    return {
      ok: true,
      token,
      url: delegateUrl(token),
      expiresAt: record.expiresAt,
    };
  } catch {
    return { ok: false, error: "Gagal membuat tautan. Silakan coba lagi." };
  } finally {
    if (locked) await redis.delete(lock).catch(() => {});
  }
}

export async function revokeDelegateGrant(
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await revokeActive(invitationId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal mencabut akses. Silakan coba lagi." };
  }
}

/* ----------------------------- delegate side ----------------------------- */

export type Resolved =
  | { ok: true; hash: string; inv: Invitation; record: GrantRecord }
  | { ok: false; reason: DelegateFailure };

/**
 * Every delegate read/write goes through here. Never trusts anything the
 * browser sends except the bearer token; invitation id comes from the grant.
 */
export async function resolveDelegate(
  token: unknown,
  now = new Date(),
): Promise<Resolved> {
  try {
    // Unknown tokens are throttled per caller (a shared bucket when no trusted
    // client IP exists); valid grants are throttled per grant, so one noisy
    // caller can never lock real delegates out.
    const reject = async (): Promise<Resolved> =>
      (await rateLimit(`delegate:bad:${await callerKey()}`, 20, 600))
        ? { ok: false, reason: "invalid" }
        : { ok: false, reason: "rate_limited" };
    if (typeof token !== "string" || !TOKEN_RE.test(token)) return reject();
    const hash = await hashDelegateToken(token);
    const record = parseRecord(await redis.get(grantKey(hash)));
    if (!record) return reject();
    if (record.revoked) return { ok: false, reason: "revoked" };
    if (Date.parse(record.expiresAt) <= now.getTime())
      return { ok: false, reason: "expired" };
    if (!(await rateLimit(`delegate:grant:${hash}`, 120, 60)))
      return { ok: false, reason: "rate_limited" };
    const [inv] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, record.invitationId),
          eq(invitations.userId, record.ownerId),
        ),
      )
      .limit(1);
    if (!inv) return { ok: false, reason: "invalid" };
    if (inv.expiresAt && inv.expiresAt <= now)
      return { ok: false, reason: "expired" };
    return { ok: true, hash, inv, record };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export interface DelegateGuest {
  id: string;
  guestName: string;
  guestGroup: string | null;
  slugToken: string;
  maxGuests: number;
  whatsappPhone: string | null;
  isSent: boolean;
  opened: boolean;
  rsvp: {
    status: "attending" | "not_attending" | "maybe" | "pending";
    guestCount: number;
  } | null;
}

export interface DelegateView {
  title: string;
  coupleNames: string;
  baseUrl: string;
  expiresAt: string;
  template: WhatsappTemplate;
  canCreate: boolean;
  limit: number;
  guests: DelegateGuest[];
}

/** Delegated guests: `dg` + 10 characters (owner tokens are exactly 10). */
const delegatedScope = sql`${guestInvites.slugToken} like 'dg%' and length(${guestInvites.slugToken}) = 12`;
const delegatedOnly = (invitationId: string) =>
  and(eq(guestInvites.invitationId, invitationId), delegatedScope);

/** Explicit column lists: nothing private can leak by adding a column. */
export async function loadDelegateView(
  r: Extract<Resolved, { ok: true }>,
): Promise<DelegateView> {
  const { inv } = r;
  const rows = await db
    .select({
      id: guestInvites.id,
      guestName: guestInvites.guestName,
      guestGroup: guestInvites.guestGroup,
      slugToken: guestInvites.slugToken,
      maxGuests: guestInvites.maxGuests,
      whatsappPhone: guestInvites.whatsappPhone,
      isSent: guestInvites.isSent,
      openedAt: guestInvites.openedAt,
      rsvpStatus: rsvpResponses.status,
      rsvpCount: rsvpResponses.guestCount,
    })
    .from(guestInvites)
    .leftJoin(
      rsvpResponses,
      and(
        eq(rsvpResponses.guestInviteId, guestInvites.id),
        eq(rsvpResponses.invitationId, inv.id),
      ),
    )
    .where(delegatedOnly(inv.id))
    .orderBy(desc(guestInvites.createdAt), desc(rsvpResponses.updatedAt));
  const seen = new Set<string>();
  const guests: DelegateGuest[] = [];
  for (const g of rows) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    guests.push({
      id: g.id,
      guestName: g.guestName,
      guestGroup: g.guestGroup,
      slugToken: g.slugToken,
      maxGuests: g.maxGuests,
      whatsappPhone: g.whatsappPhone,
      isSent: g.isSent,
      opened: g.openedAt !== null,
      rsvp: g.rsvpStatus
        ? { status: g.rsvpStatus, guestCount: g.rsvpCount ?? 0 }
        : null,
    });
  }
  const template = await readWhatsappTemplate(
    whatsappMessageKey(inv.userId, inv.id),
  ).catch(defaultWhatsappTemplate);
  return {
    title: inv.eventTitle ?? "Undangan",
    coupleNames: whatsappCoupleNames(inv.sections, inv.eventTitle),
    baseUrl: `${env.BETTER_AUTH_URL}/${inv.slug}`,
    expiresAt: r.record.expiresAt,
    template,
    canCreate: hasProFeatures(inv),
    limit: DELEGATE_MAX_GUESTS,
    guests,
  };
}

const cleanText = (v: unknown, max: number) =>
  (typeof v === "string" ? v : "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, max);

/** Why a write was refused after the grant itself resolved. */
export interface DelegateWriteFailure {
  ok: false;
  error: string;
  /** The grant was revoked or expired while the request waited. */
  dead?: DelegateFailure;
}
type WriteResult = { ok: true } | DelegateWriteFailure;

const NO_WRITE: DelegateWriteFailure = {
  ok: false,
  error: "Akses ini tidak mengizinkan perubahan tamu.",
};
const hasScope = (record: GrantRecord, scope: string) =>
  record.scopes.includes(scope);

/**
 * Re-reads the grant. A request may have resolved a valid grant and then waited
 * for the invitation lock while the owner revoked or replaced it; the write must
 * not go through in that case. Fails closed if Redis cannot be read.
 */
async function grantProblem(
  r: Extract<Resolved, { ok: true }>,
  now = new Date(),
): Promise<DelegateFailure | null> {
  const record = parseRecord(await redis.get(grantKey(r.hash)));
  if (!record) return "invalid";
  if (record.revoked) return "revoked";
  if (Date.parse(record.expiresAt) <= now.getTime()) return "expired";
  return null;
}

const FAILURE_MESSAGE: Partial<Record<DelegateFailure, string>> = {
  revoked: "Akses telah dicabut.",
  expired: "Akses sudah kedaluwarsa.",
  invalid: "Akses tidak valid.",
};
const dead = (reason: DelegateFailure): DelegateWriteFailure => ({
  ok: false,
  error: FAILURE_MESSAGE[reason] ?? "Akses tidak valid.",
  dead: reason,
});

export async function createDelegatedGuest(
  r: Extract<Resolved, { ok: true }>,
  input: { name: unknown; group: unknown; phone: unknown; maxGuests: unknown },
  makeToken: () => string,
): Promise<WriteResult> {
  const { inv, hash } = r;
  if (!hasScope(r.record, "guests:create")) return NO_WRITE;
  if (!hasProFeatures(inv))
    return {
      ok: false,
      error: "Penambahan tamu tidak tersedia untuk undangan ini saat ini.",
    };
  const guestName = cleanText(input.name, 100);
  if (!guestName) return { ok: false, error: "Nama tamu wajib diisi." };
  const phone = cleanText(input.phone, 50);
  if (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone))
    return { ok: false, error: "Nomor WhatsApp tidak valid." };
  const maxGuests = Math.min(
    DELEGATE_GUEST_MAX_PARTY,
    Math.max(1, Math.floor(Number(input.maxGuests)) || 2),
  );
  try {
    if (!(await rateLimit(`delegate:write:${hash}`, 20, 60)))
      return {
        ok: false,
        error: "Terlalu cepat. Tunggu sebentar lalu coba lagi.",
      };
    // Manual add keeps its existing policy: no duplicate check.
    const out = await insertDelegatedGuests(
      r,
      [
        {
          name: guestName,
          phone: phone || null,
          group: cleanText(input.group, 100) || null,
          maxGuests,
        },
      ],
      makeToken,
      false,
    );
    if (out.aborted) return dead(out.reason);
    const [status] = out.statuses;
    if (status === "limit")
      return {
        ok: false,
        error: `Batas ${DELEGATE_MAX_GUESTS} tamu tercapai.`,
      };
    return status === "added"
      ? { ok: true }
      : { ok: false, error: "Gagal menambah tamu. Silakan coba lagi." };
  } catch {
    return { ok: false, error: "Gagal menambah tamu. Silakan coba lagi." };
  }
}

/**
 * Delegated writer: the invitation-wide ceiling (DELEGATE_MAX_GUESTS, counted
 * over every `dg` guest of the invitation from stored rows) and duplicate checks
 * run inside the shared locked transaction, after re-validating the grant.
 * Duplicates never look at the owner's guests.
 */
async function insertDelegatedGuests(
  r: Extract<Resolved, { ok: true }>,
  items: CleanBulkItem[],
  makeToken: () => string,
  dedupe: boolean,
) {
  const out = await insertGuestsLocked({
    database: db,
    invitationId: r.inv.id,
    scope: delegatedScope,
    items,
    makeToken: () => DELEGATE_TOKEN_PREFIX + makeToken(),
    dedupe,
    cap: DELEGATE_MAX_GUESTS,
    afterLock: () => grantProblem(r),
  });
  return out.aborted
    ? { aborted: true as const, reason: out.reason as DelegateFailure }
    : out;
}

/**
 * Runs `fn` in the shared locked transaction (so it is ordered against bulk and
 * other writes) after re-validating the grant.
 */
async function withDelegateLock<T>(
  r: Extract<Resolved, { ok: true }>,
  fn: (tx: Tx) => Promise<T>,
): Promise<T | DelegateWriteFailure> {
  return db.transaction(async (tx) => {
    await lockInvitation(tx, r.inv.id);
    const problem = await grantProblem(r);
    return problem ? dead(problem) : fn(tx);
  });
}

export async function markDelegatedGuestSentChecked(
  r: Extract<Resolved, { ok: true }>,
  guestId: unknown,
): Promise<WriteResult> {
  if (!isUuid(guestId)) return { ok: false, error: "Tamu tidak ditemukan." };
  if (!hasScope(r.record, "guests:create")) return NO_WRITE;
  try {
    const res = await withDelegateLock(r, (tx) =>
      tx
        .update(guestInvites)
        .set({ isSent: true, sentAt: new Date() })
        .where(and(eq(guestInvites.id, guestId), delegatedOnly(r.inv.id)))
        .returning({ id: guestInvites.id }),
    );
    if (!Array.isArray(res)) return res;
    return res.length > 0
      ? { ok: true }
      : { ok: false, error: "Tamu tidak ditemukan." };
  } catch {
    return { ok: false, error: "Gagal menyimpan status. Silakan coba lagi." };
  }
}

export async function markDelegatedGuestSent(
  r: Extract<Resolved, { ok: true }>,
  guestId: unknown,
): Promise<boolean> {
  return (await markDelegatedGuestSentChecked(r, guestId)).ok;
}

/**
 * Bulk variant of createDelegatedGuest for contacts picked on the device.
 * Shares `insertDelegatedGuests`, so single and bulk adds use one quota and one lock.
 */
export async function createDelegatedGuestsBulk(
  r: Extract<Resolved, { ok: true }>,
  input: unknown,
  makeToken: () => string,
): Promise<BulkResult & { dead?: DelegateFailure }> {
  const { inv, hash } = r;
  if (!hasScope(r.record, "guests:create")) return NO_WRITE;
  if (!hasProFeatures(inv))
    return {
      ok: false,
      error: "Penambahan tamu tidak tersedia untuk undangan ini saat ini.",
    };
  const items = sanitizeBulk(input, DELEGATE_GUEST_MAX_PARTY);
  if (!items)
    return {
      ok: false,
      error: `Daftar tamu tidak valid (1 sampai ${BULK_GUEST_MAX} kontak).`,
    };
  try {
    if (!(await rateLimit(`delegate:bulk:${hash}`, 5, 60)))
      return {
        ok: false,
        error: "Terlalu cepat. Tunggu sebentar lalu coba lagi.",
      };
    const out = await insertDelegatedGuests(r, items, makeToken, true);
    if (out.aborted) return dead(out.reason);
    return {
      ok: true,
      statuses: out.statuses,
      added: out.statuses.filter((s) => s === "added").length,
    };
  } catch {
    return { ok: false, error: "Gagal menambah tamu. Silakan coba lagi." };
  }
}

/**
 * Rename of a delegated guest: one conditional UPDATE scoped to this
 * invitation's `dg` guests that have not been sent or opened, ordered against
 * every other write by the invitation lock. Owner guests and other invitations
 * never match.
 */
export async function renameDelegatedGuest(
  r: Extract<Resolved, { ok: true }>,
  guestId: unknown,
  name: unknown,
): Promise<WriteResult> {
  const { inv, hash } = r;
  if (!hasScope(r.record, "guests:create")) return NO_WRITE;
  if (!hasProFeatures(inv))
    return {
      ok: false,
      error: "Perubahan tamu tidak tersedia untuk undangan ini saat ini.",
    };
  if (!isUuid(guestId)) return { ok: false, error: "Tamu tidak ditemukan." };
  const guestName = cleanText(name, 100);
  if (!guestName) return { ok: false, error: "Nama tamu wajib diisi." };
  try {
    if (!(await rateLimit(`delegate:edit:${hash}`, 60, 60)))
      return {
        ok: false,
        error: "Terlalu cepat. Tunggu sebentar lalu coba lagi.",
      };
    const out = await withDelegateLock(r, async (tx): Promise<WriteResult> => {
      const changed = await tx
        .update(guestInvites)
        .set({ guestName })
        .where(
          and(
            eq(guestInvites.id, guestId),
            delegatedOnly(inv.id),
            eq(guestInvites.isSent, false),
            isNull(guestInvites.openedAt),
          ),
        )
        .returning({ id: guestInvites.id });
      if (changed.length) return { ok: true };
      const [exists] = await tx
        .select({ id: guestInvites.id })
        .from(guestInvites)
        .where(and(eq(guestInvites.id, guestId), delegatedOnly(inv.id)))
        .limit(1);
      return {
        ok: false,
        error: exists ? NAME_LOCKED_MESSAGE : "Tamu tidak ditemukan.",
      };
    });
    return out;
  } catch {
    return { ok: false, error: "Gagal menyimpan nama. Silakan coba lagi." };
  }
}

/** Category can change at any time; an empty value removes it. */
export async function setDelegatedGuestCategory(
  r: Extract<Resolved, { ok: true }>,
  guestId: unknown,
  category: unknown,
): Promise<WriteResult> {
  const { inv, hash } = r;
  if (!hasScope(r.record, "guests:create")) return NO_WRITE;
  if (!hasProFeatures(inv))
    return {
      ok: false,
      error: "Perubahan tamu tidak tersedia untuk undangan ini saat ini.",
    };
  if (!isUuid(guestId)) return { ok: false, error: "Tamu tidak ditemukan." };
  try {
    if (!(await rateLimit(`delegate:edit:${hash}`, 60, 60)))
      return {
        ok: false,
        error: "Terlalu cepat. Tunggu sebentar lalu coba lagi.",
      };
    return await withDelegateLock(r, async (tx): Promise<WriteResult> => {
      const known = await tx
        .select({ group: guestInvites.guestGroup })
        .from(guestInvites)
        .where(delegatedOnly(inv.id));
      const changed = await tx
        .update(guestInvites)
        .set({
          guestGroup: canonicalCategory(
            category,
            known.map((row) => row.group),
          ),
        })
        .where(and(eq(guestInvites.id, guestId), delegatedOnly(inv.id)))
        .returning({ id: guestInvites.id });
      return changed.length
        ? { ok: true }
        : { ok: false, error: "Tamu tidak ditemukan." };
    });
  } catch {
    return { ok: false, error: "Gagal menyimpan kategori. Silakan coba lagi." };
  }
}
