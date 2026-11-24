import { and, eq, type SQL } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { guestInvites, invitations } from "@/lib/db/schema";
import {
  duplicateTracker,
  type BulkItemStatus,
  type CleanBulkItem,
} from "./contact-import";
import { canonicalizeGroups } from "./guest-list";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Serialises every guest write of one invitation (owner bulk, delegate single,
 * delegate bulk, edits). Taken first, before anything is read, so duplicate and
 * quota decisions are made on data no other writer can change meanwhile.
 */
export async function lockInvitation(tx: Tx, invitationId: string) {
  await tx
    .select({ id: invitations.id })
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .for("update");
}

export type InsertOutcome =
  | { aborted: false; statuses: BulkItemStatus[] }
  | { aborted: true; reason: string };

/**
 * The only bulk writer of guests. One transaction: lock the invitation, run the
 * caller's `afterLock` guard (e.g. "is the delegate grant still valid?"), read
 * the guests in `scope`, then insert each item in its own savepoint so a failing
 * row never aborts the others. Duplicates are decided after the lock and only
 * saved guests are remembered, so parallel imports and retries cannot create
 * unwanted duplicates. `cap` is the maximum number of guests in `scope`
 * (counted from stored rows); null means unlimited.
 */
export async function insertGuestsLocked(opts: {
  database: Database;
  invitationId: string;
  /** Which stored guests count for duplicates, categories and the cap. */
  scope: SQL | undefined;
  items: CleanBulkItem[];
  makeToken: () => string;
  dedupe: boolean;
  cap: number | null;
  afterLock?: () => Promise<string | null>;
}): Promise<InsertOutcome> {
  return opts.database.transaction(async (tx) => {
    await lockInvitation(tx, opts.invitationId);
    const reason = (await opts.afterLock?.()) ?? null;
    if (reason) return { aborted: true, reason } as const;
    const existing = await tx
      .select({
        name: guestInvites.guestName,
        phone: guestInvites.whatsappPhone,
        group: guestInvites.guestGroup,
      })
      .from(guestInvites)
      .where(and(eq(guestInvites.invitationId, opts.invitationId), opts.scope));
    const tracker = duplicateTracker(existing);
    const grouped = canonicalizeGroups(
      opts.items,
      existing.map((row) => row.group),
    );
    let room = opts.cap === null ? Infinity : opts.cap - existing.length;
    const statuses: BulkItemStatus[] = [];
    for (const [i, item] of opts.items.entries()) {
      if (!item.name) {
        statuses.push("invalid");
      } else if (opts.dedupe && tracker.has(item)) {
        statuses.push("duplicate");
      } else if (room <= 0) {
        statuses.push("limit");
      } else {
        try {
          await tx.transaction((savepoint) =>
            savepoint.insert(guestInvites).values({
              invitationId: opts.invitationId,
              guestName: item.name,
              slugToken: opts.makeToken(),
              guestGroup: grouped[i].group,
              maxGuests: item.maxGuests,
              whatsappPhone: item.phone,
            }),
          );
          room--;
          tracker.add(item);
          statuses.push("added");
        } catch {
          statuses.push("failed");
        }
      }
    }
    return { aborted: false, statuses } as const;
  });
}
