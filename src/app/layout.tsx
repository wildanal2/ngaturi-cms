import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { siteIndexingEnabled } from "@/lib/site-indexing";

const inter = localFont({
  src: "../assets/fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const fraunces = localFont({
  src: "../assets/fonts/fraunces-latin.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

const parisienne = localFont({
  src: "../assets/fonts/parisienne-latin.woff2",
  variable: "--font-parisienne",
  weight: "400",
  display: "swap",
});

const philosopher = localFont({
  src: [
    { path: "../assets/fonts/philosopher-regular-latin.woff2", weight: "400" },
    { path: "../assets/fonts/philosopher-bold-latin.woff2", weight: "700" },
  ],
  variable: "--font-philosopher",
  display: "swap",
});

const cormorant = localFont({
  src: "../assets/fonts/cormorant-garamond-latin.woff2",
  variable: "--font-cormorant",
  weight: "400 700",
  display: "swap",
});

const SITE_NAME = "Ngaturi";
const DESCRIPTION =
  "Buat undangan digital pernikahan, khitan, aqiqah, dan tahlil yang elegan dalam hitungan menit — RSVP, buku tamu, galeri, hitung mundur, dan bagikan lewat WhatsApp. Undangan pertama gratis.";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const SITE_URL = process.env.BETTER_AUTH_URL!;
  const indexing = siteIndexingEnabled();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Ngaturi — Undangan Digital Pernikahan, Khitan & Aqiqah",
      template: "%s · Ngaturi",
    },
    description: DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      "undangan digital",
      "undangan pernikahan online",
      "undangan nikah digital",
      "undangan khitan",
      "undangan aqiqah",
      "undangan tahlil",
      "website undangan",
      "e-invitation",
      "RSVP online",
      "undangan WhatsApp",
    ],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    manifest: "/site.webmanifest",
    alternates: { canonical: "/" },
    category: "lifestyle",
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: SITE_URL,
      siteName: SITE_NAME,
      title: "Ngaturi — Undangan Digital yang Elegan & Mudah",
      description: DESCRIPTION,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Ngaturi — Undangan Digital",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Ngaturi — Undangan Digital yang Elegan & Mudah",
      description: DESCRIPTION,
      images: ["/og-image.png"],
    },
    robots: {
      index: indexing,
      follow: indexing,
      googleBot: {
        index: indexing,
        follow: indexing,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#12573F",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const siteUrl = process.env.BETTER_AUTH_URL!;
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo/logo-icon.png`,
    description: DESCRIPTION,
  };
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    inLanguage: "id-ID",
  };
  return (
    <html
      lang="id"
      className={`${inter.variable} ${fraunces.variable} ${parisienne.variable} ${philosopher.variable} ${cormorant.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd([orgJsonLd, siteJsonLd]),
          }}
        />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
