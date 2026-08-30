import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ngaturi.com";
const SITE_NAME = "Ngaturi";
const DESCRIPTION =
  "Buat undangan digital pernikahan, khitan, aqiqah, dan tahlil yang elegan dalam hitungan menit — RSVP, buku tamu, galeri, hitung mundur, dan bagikan lewat WhatsApp. Undangan pertama gratis.";

export const metadata: Metadata = {
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
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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

export const viewport: Viewport = {
  themeColor: "#12573F",
  colorScheme: "light",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo/logo-icon.png`,
  description: DESCRIPTION,
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "id-ID",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${fraunces.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([orgJsonLd, siteJsonLd]),
          }}
        />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
