import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestbookMessages, rsvpResponses } from "@/lib/db/schema";

export interface InvitationStat {
  attending: number;
  messages: number;
}

/** Confirmed-guest count + guestbook message count per invitation id. */
export async function getInvitationStats(
  ids: string[],
): Promise<Map<string, InvitationStat>> {
  const map = new Map<string, InvitationStat>();
  if (ids.length === 0) return map;

  const [attendRows, messageRows] = await Promise.all([
    db
      .select({
        id: rsvpResponses.invitationId,
        n: sql<number>`coalesce(sum(${rsvpResponses.guestCount}), 0)::int`,
      })
      .from(rsvpResponses)
      .where(
        and(
          inArray(rsvpResponses.invitationId, ids),
          eq(rsvpResponses.status, "attending"),
        ),
      )
      .groupBy(rsvpResponses.invitationId),
    db
      .select({
        id: guestbookMessages.invitationId,
        n: sql<number>`count(*)::int`,
      })
      .from(guestbookMessages)
      .where(inArray(guestbookMessages.invitationId, ids))
      .groupBy(guestbookMessages.invitationId),
  ]);

  for (const id of ids) map.set(id, { attending: 0, messages: 0 });
  for (const r of attendRows) map.get(r.id)!.attending = r.n;
  for (const r of messageRows) map.get(r.id)!.messages = r.n;
  return map;
}
