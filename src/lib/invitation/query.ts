import { cache } from "react";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, guestInvites } from "@/lib/db/schema";
import type { GlobalSettings, SectionData } from "@/sections/types";

export interface PublicInvitation {
  id: string;
  slug: string;
  userId: string;
  status: string;
  eventTitle: string | null;
  eventType: string;
  eventDate: string | null;
  hasWatermark: boolean;
  sections: SectionData[];
  global: GlobalSettings;
}

// react cache() dedups the query across generateMetadata + the page +
// opengraph-image within a single request.
export const getPublicInvitation = cache(async function getPublicInvitation(
  slug: string,
): Promise<PublicInvitation | null> {
  const [row] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    userId: row.userId,
    status: row.status,
    eventTitle: row.eventTitle,
    eventType: row.eventType,
    eventDate: row.eventDate?.toISOString() ?? null,
    hasWatermark: row.hasWatermark,
    sections: row.sections as SectionData[],
    global: row.globalSettings as GlobalSettings,
  };
});

const EVENT_LABEL: Record<string, string> = {
  wedding: "Pernikahan",
  khitan: "Khitan",
  tahlil: "Tahlil",
  aqiqah: "Aqiqah",
  engagement: "Lamaran",
  birthday: "Ulang Tahun",
  generic: "Acara",
};

/** display name, photo (cover → hero), first venue — for SEO/OG/JSON-LD. */
export function invitationSummary(inv: PublicInvitation) {
  const cover = inv.sections.find((s) => s.type === "cover");
  const hero = inv.sections.find((s) => s.type === "hero");
  const events = inv.sections.find((s) => s.type === "event-details");

  const names =
    (cover?.props?.names as string) ||
    (hero?.props?.couple_names as string) ||
    inv.eventTitle ||
    "Undangan";

  const pick = (v: unknown) =>
    typeof v === "string" && /^https?:\/\//.test(v) ? v : null;
  const photo =
    pick(cover?.props?.background_image) ||
    pick(hero?.props?.background_image) ||
    null;

  const firstEvent = (events?.props?.events as Array<Record<string, unknown>>)
    ?.[0];

  return {
    names,
    photo,
    eventLabel: EVENT_LABEL[inv.eventType] ?? "Acara",
    venueName: (firstEvent?.venue_name as string) || null,
    venueAddress: (firstEvent?.address as string) || null,
  };
}

export async function getGuestByToken(
  invitationId: string,
  token: string,
): Promise<{ id: string; name: string } | null> {
  const [g] = await db
    .select({ id: guestInvites.id, name: guestInvites.guestName })
    .from(guestInvites)
    .where(
      and(
        eq(guestInvites.invitationId, invitationId),
        eq(guestInvites.slugToken, token),
      ),
    )
    .limit(1);
  return g ?? null;
}

export async function markGuestOpened(guestId: string): Promise<void> {
  await db
    .update(guestInvites)
    .set({ openedAt: new Date() })
    .where(and(eq(guestInvites.id, guestId), isNull(guestInvites.openedAt)));
}
