import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { invitations, invitationViews } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import {
  getPublicInvitation,
  getGuestByToken,
  markGuestOpened,
  invitationSummary,
} from "@/lib/invitation/query";
import { InvitationCover } from "@/components/invitation/cover";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ngaturi.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getPublicInvitation(slug);
  if (!inv || inv.status !== "published") {
    return { title: "Undangan tidak ditemukan", robots: { index: false } };
  }

  const s = invitationSummary(inv);
  const dateText = inv.eventDate
    ? new Date(inv.eventDate).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const title = `Undangan ${s.eventLabel} ${s.names}`;
  const description =
    `Dengan hormat kami mengundang Anda untuk hadir di acara ${s.eventLabel.toLowerCase()} ${s.names}` +
    (dateText ? ` pada ${dateText}` : "") +
    (s.venueName ? ` di ${s.venueName}` : "") +
    ". Konfirmasi kehadiran (RSVP) & kirim ucapan di sini.";
  const url = `${SITE_URL}/${inv.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url,
      siteName: "Ngaturi",
      title,
      description,
      images: [
        {
          url: `/${inv.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/${inv.slug}/opengraph-image`],
    },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { slug } = await params;
  const { to } = await searchParams;
  const inv = await getPublicInvitation(slug);

  if (!inv || inv.status !== "published") notFound();

  const guest = to ? await getGuestByToken(inv.id, to) : null;
  const guestName = guest?.name ?? null;

  // track view setelah response
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const ua = h.get("user-agent") ?? null;
  after(async () => {
    try {
      await db.insert(invitationViews).values({
        invitationId: inv.id,
        visitorId: (ip ?? "anon").slice(0, 100),
        ipAddress: ip?.slice(0, 64) ?? null,
        userAgent: ua?.slice(0, 500) ?? null,
        referrer: h.get("referer")?.slice(0, 500) ?? null,
      });
      await db
        .update(invitations)
        .set({ viewCount: sql`${invitations.viewCount} + 1` })
        .where(eq(invitations.id, inv.id));
      if (guest) await markGuestOpened(guest.id);
    } catch {
      /* noop */
    }
  });

  const hasCoverSection = inv.sections.some((s) => s.type === "cover");

  const s = invitationSummary(inv);
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${s.eventLabel} ${s.names}`,
    ...(inv.eventDate ? { startDate: inv.eventDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(s.photo ? { image: [s.photo] } : {}),
    ...(s.venueName
      ? {
          location: {
            "@type": "Place",
            name: s.venueName,
            ...(s.venueAddress ? { address: s.venueAddress } : {}),
          },
        }
      : {}),
    organizer: { "@type": "Organization", name: "Ngaturi", url: SITE_URL },
    url: `${SITE_URL}/${inv.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      {/* crawler-visible heading (behind the cover overlay) */}
      <h1 className="sr-only">
        Undangan {s.eventLabel} {s.names}
      </h1>
      {!hasCoverSection && inv.global.cover_enabled !== false ? (
        <InvitationCover
          names={
            (inv.sections.find((s) => s.type === "hero")?.props
              ?.couple_names as string) ?? inv.eventTitle ?? "Undangan"
          }
          guestName={guestName}
          global={inv.global}
        />
      ) : null}
      <InvitationRenderer
        sections={inv.sections}
        global={inv.global}
        invitationId={inv.id}
        guestName={guestName}
      />
      {inv.hasWatermark ? (
        <p className="bg-white py-4 text-center text-xs text-gray-400">
          Dibuat dengan Ngaturi · buat undanganmu di ngaturi.com
        </p>
      ) : null}
    </>
  );
}
