import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { databaseUtcNow } from "@/lib/db/time";

/** Tandai builder terkunci untuk trial yang masa editnya lewat & belum bayar. */
export async function lockExpiredEdits(): Promise<number> {
  const res = await db
    .update(invitations)
    .set({ isEditLocked: true, updatedAt: new Date() })
    .where(
      and(
        eq(invitations.plan, "free_trial"),
        eq(invitations.isPaid, false),
        eq(invitations.isEditLocked, false),
        sql`${invitations.editExpiresAt} < ${databaseUtcNow}`,
      ),
    )
    .returning({ id: invitations.id });
  return res.length;
}

/** Arsipkan undangan published yang sudah lewat expires_at. */
export async function archiveExpired(): Promise<number> {
  const res = await db
    .update(invitations)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(invitations.status, "published"),
        sql`${invitations.expiresAt} < ${databaseUtcNow}`,
      ),
    )
    .returning({ id: invitations.id });
  return res.length;
}
