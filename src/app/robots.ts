import type { MetadataRoute } from "next";
import { siteIndexingEnabled } from "@/lib/site-indexing";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const rules = {
    userAgent: "*",
    allow: "/",
    disallow: ["/dashboard", "/builder", "/admin", "/api", "/invitations"],
  };
  // Crawlers must be able to fetch public pages to observe noindex headers/meta.
  if (!siteIndexingEnabled()) return { rules };
  const siteUrl = process.env.BETTER_AUTH_URL!;
  return {
    rules,
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
