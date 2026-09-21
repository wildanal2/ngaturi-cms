import type { NextConfig } from "next";

const s3Host = (() => {
  try {
    return new URL(
      process.env.S3_PUBLIC_URL ?? "https://ngaturicom.t3.tigrisfiles.io",
    ).hostname;
  } catch {
    return "ngaturicom.t3.tigrisfiles.io";
  }
})();

const allowedDevOrigins =
  process.env.NODE_ENV === "development"
    ? (process.env.ALLOWED_DEV_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),

  // Legacy links and persisted asset URLs share the single canonical template.
  redirects() {
    return [
      { source: "/templates/enchanted-garden/:path*", destination: "/templates/sekar-jawa-3d/:path*", permanent: true },
      { source: "/themes/enchanted-garden/:path*", destination: "/themes/sekar-jawa-3d/:path*", permanent: true },
    ];
  },

  turbopack: {
    root: import.meta.dirname,
  },
  serverExternalPackages: ["sharp"],
  // keep recently-visited dynamic pages (dashboard) in the client router
  // cache briefly so back-and-forth navigation is instant
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: s3Host },
      // dummy/placeholder images for template defaults (free to use)
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;
