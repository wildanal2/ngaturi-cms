"use server";

import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import type { BulkResult } from "./contact-import";
import {
  createDelegatedGuest,
  createDelegatedGuestsBulk,
  issueDelegateGrant,
  isUuid,
  loadDelegateView,
  markDelegatedGuestSent,
  renameDelegatedGuest,
  setDelegatedGuestCategory,
  readDelegateStatus,
  resolveDelegate,
  revokeDelegateGrant,
  type DelegateFailure,
  type DelegateStatus,
  type DelegateView,
} from "./delegation";

const guestToken = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 10);

async function ownedInvitation(invitationId: unknown) {
  const session = await requireUser();
  if (!isUuid(invitationId)) throw new Error("Undangan tidak ditemukan.");
  const [inv] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!inv) throw new Error("Undangan tidak ditemukan.");
  return inv;
}

/* -------------------------------- owner -------------------------------- */

export async function getDelegateStatus(
  invitationId: string,
): Promise<DelegateStatus> {
  const inv = await ownedInvitation(invitationId);
  return readDelegateStatus(inv.id);
}

/** The raw token is returned exactly once; only its hash is stored. */
export async function createDelegateLink(invitationId: string, days: number) {
  const inv = await ownedInvitation(invitationId);
  const res = await issueDelegateGrant(inv, days);
  revalidatePath(`/invitations/${inv.id}`);
  return res;
}

export async function revokeDelegateLink(invitationId: string) {
  const inv = await ownedInvitation(invitationId);
  const res = await revokeDelegateGrant(inv.id);
  revalidatePath(`/invitations/${inv.id}`);
  return res;
}

/* ------------------------------- delegate ------------------------------- */

export type DelegateResult =
  | { ok: true; view: DelegateView; error?: string }
  | { ok: false; reason: DelegateFailure };

export async function fetchDelegateView(
  token: string,
): Promise<DelegateResult> {
  const r = await resolveDelegate(token);
  if (!r.ok) return r;
  try {
    return { ok: true, view: await loadDelegateView(r) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function addDelegateGuest(
  token: string,
  formData: FormData,
): Promise<DelegateResult> {
  const r = await resolveDelegate(token);
  if (!r.ok) return r;
  const created = await createDelegatedGuest(
    r,
    {
      name: formData.get("guest_name"),
      group: formData.get("guest_group"),
      phone: formData.get("whatsapp_phone"),
      maxGuests: formData.get("max_guests"),
    },
    guestToken,
  );
  try {
    const view = await loadDelegateView(r);
    return created.ok
      ? { ok: true, view }
      : { ok: true, view, error: created.error };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export type DelegateBulkResult =
  | { ok: true; view: DelegateView; bulk: BulkResult }
  | { ok: false; reason: DelegateFailure };

export async function addDelegateGuestsBulk(
  token: string,
  input: unknown,
): Promise<DelegateBulkResult> {
  const r = await resolveDelegate(token);
  if (!r.ok) return r;
  const bulk = await createDelegatedGuestsBulk(r, input, guestToken);
  try {
    return { ok: true, view: await loadDelegateView(r), bulk };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function markDelegateGuestSent(
  token: string,
  guestId: string,
): Promise<DelegateResult> {
  const r = await resolveDelegate(token);
  if (!r.ok) return r;
  try {
    await markDelegatedGuestSent(r, guestId);
    return { ok: true, view: await loadDelegateView(r) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

async function editDelegated(
  token: string,
  run: (
    r: Extract<Awaited<ReturnType<typeof resolveDelegate>>, { ok: true }>,
  ) => Promise<{ ok: true } | { ok: false; error: string }>,
): Promise<DelegateResult> {
  const r = await resolveDelegate(token);
  if (!r.ok) return r;
  const done = await run(r);
  try {
    const view = await loadDelegateView(r);
    return done.ok ? { ok: true, view } : { ok: true, view, error: done.error };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function renameDelegateGuest(
  token: string,
  guestId: string,
  name: string,
): Promise<DelegateResult> {
  return editDelegated(token, (r) => renameDelegatedGuest(r, guestId, name));
}

export async function setDelegateGuestCategory(
  token: string,
  guestId: string,
  category: string | null,
): Promise<DelegateResult> {
  return editDelegated(token, (r) =>
    setDelegatedGuestCategory(r, guestId, category),
  );
}
