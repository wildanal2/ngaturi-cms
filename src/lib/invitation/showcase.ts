import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";

export interface ShowcaseItem {
  slug: string;
  title: string;
  eventType: string;
  /** the invitation's own generated OG card — always reflects its data */
  image: string;
}

const SHOWCASE_CARD_VERSION = "2";

/** Undangan yang baru dipublikasikan (untuk showcase di landing). */
export async function getRecentInvitations(limit = 12): Promise<ShowcaseItem[]> {
  const rows = await db
    .select({
      slug: invitations.slug,
      title: invitations.eventTitle,
      eventType: invitations.eventType,
      updatedAt: invitations.updatedAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.status, "published"),
        gt(invitations.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(invitations.publishedAt))
    .limit(limit);

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title ?? "Undangan",
    eventType: r.eventType,
    // Cache-bust both invitation edits and card-renderer revisions.
    image: `/${r.slug}/opengraph-image?v=${r.updatedAt?.getTime() ?? 0}&card=${SHOWCASE_CARD_VERSION}`,
  }));
}
