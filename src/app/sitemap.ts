import type { MetadataRoute } from "next";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { databaseUtcNow } from "@/lib/db/time";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = process.env.BETTER_AUTH_URL!;
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/templates`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/undangan-terbaru`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let published: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ slug: invitations.slug, updatedAt: invitations.updatedAt })
      .from(invitations)
      .where(
        and(
          eq(invitations.status, "published"),
          gt(invitations.expiresAt, databaseUtcNow),
        ),
      )
      .orderBy(desc(invitations.publishedAt))
      .limit(5000);
    published = rows.map((r) => ({
      url: `${SITE_URL}/${r.slug}`,
      lastModified: r.updatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {
    /* DB unavailable at build — static pages still ship */
  }

  return [...staticPages, ...published];
}
