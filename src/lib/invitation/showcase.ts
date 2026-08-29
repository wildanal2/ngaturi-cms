import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";

export interface ShowcaseItem {
  slug: string;
  title: string;
  eventType: string;
  /** hero photo if any, otherwise the generated OG card */
  image: string;
  hasPhoto: boolean;
}

function heroImage(sections: unknown): string | null {
  if (!Array.isArray(sections)) return null;
  const hero = sections.find(
    (s): s is { props?: Record<string, unknown> } =>
      typeof s === "object" && s !== null && (s as { type?: string }).type === "hero",
  );
  const bg = hero?.props?.background_image;
  return typeof bg === "string" && bg.startsWith("http") ? bg : null;
}

/** Undangan yang baru dipublikasikan (untuk showcase di landing). */
export async function getRecentInvitations(limit = 12): Promise<ShowcaseItem[]> {
  const rows = await db
    .select({
      slug: invitations.slug,
      title: invitations.eventTitle,
      eventType: invitations.eventType,
      sections: invitations.sections,
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

  return rows.map((r) => {
    const photo = heroImage(r.sections);
    return {
      slug: r.slug,
      title: r.title ?? "Undangan",
      eventType: r.eventType,
      image: photo ?? `/${r.slug}/opengraph-image`,
      hasPhoto: Boolean(photo),
    };
  });
}
