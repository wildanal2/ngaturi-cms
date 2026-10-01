import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.NODE_ENV === "development"
    ? (process.env.ALLOWED_DEV_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

const nextConfig: NextConfig = {
  output: "standalone",
  ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),

  // Legacy links and persisted asset URLs share the single canonical template.
  redirects() {
    return [
      {
        source: "/templates/enchanted-garden/:path*",
        destination: "/templates/sekar-jawa-3d/:path*",
        permanent: true,
      },
      {
        source: "/themes/enchanted-garden/:path*",
        destination: "/themes/sekar-jawa-3d/:path*",
        permanent: true,
      },
    ];
  },

  turbopack: {
    root: import.meta.dirname,
  },
  // keep recently-visited dynamic pages (dashboard) in the client router
  // cache briefly so back-and-forth navigation is instant
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    // Uploaded media is already resized and encoded by Sharp. Keeping the
    // browser on its runtime R2 URL avoids freezing one environment's media
    // hostname into the standalone image (and avoids an open image proxy).
    unoptimized: true,
    remotePatterns: [
      // dummy/placeholder images for template defaults (free to use)
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;
