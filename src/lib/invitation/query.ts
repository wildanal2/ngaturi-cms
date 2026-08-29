import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, guestInvites } from "@/lib/db/schema";
import type { GlobalSettings, SectionData } from "@/sections/types";

export interface PublicInvitation {
  id: string;
  slug: string;
  status: string;
  eventTitle: string | null;
  eventType: string;
  eventDate: string | null;
  hasWatermark: boolean;
  sections: SectionData[];
  global: GlobalSettings;
}

// NOTE: direct query for MVP. Move to `'use cache'` + cacheTag/updateTag
// once cacheComponents is enabled project-wide.
export async function getPublicInvitation(
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
    status: row.status,
    eventTitle: row.eventTitle,
    eventType: row.eventType,
    eventDate: row.eventDate?.toISOString() ?? null,
    hasWatermark: row.hasWatermark,
    sections: row.sections as SectionData[],
    global: row.globalSettings as GlobalSettings,
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
