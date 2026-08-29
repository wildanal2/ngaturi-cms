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
    // cache-bust so an edited invitation refreshes its card
    image: `/${r.slug}/opengraph-image?v=${r.updatedAt?.getTime() ?? 0}`,
  }));
}
