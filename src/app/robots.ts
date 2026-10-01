import type { MetadataRoute } from "next";
import { siteIndexingEnabled } from "@/lib/site-indexing";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!siteIndexingEnabled()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const siteUrl = process.env.BETTER_AUTH_URL!;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/builder", "/admin", "/api", "/invitations"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
