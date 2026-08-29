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

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  serverExternalPackages: ["sharp"],
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
