import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, musicTracks } from "@/lib/db/schema";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string;
  coverUrl: string | null;
  license: string | null;
  attribution: string | null;
  genre: string | null;
}

export const getMusicCatalog = cache(async function getMusicCatalog(): Promise<
  MusicTrack[]
> {
  try {
    return await db
      .select({
        id: musicTracks.id,
        title: musicTracks.title,
        artist: musicTracks.artist,
        audioUrl: musicTracks.audioUrl,
        coverUrl: musicTracks.coverUrl,
        license: musicTracks.license,
        attribution: musicTracks.attribution,
        genre: musicTracks.genre,
      })
      .from(musicTracks)
      .where(eq(musicTracks.isActive, true))
      .orderBy(asc(musicTracks.sortOrder), asc(musicTracks.title));
  } catch {
    return [];
  }
});

/**
 * Berapa kali tiap track dipakai di undangan yang dipublikasikan —
 * dipakai untuk badge "Trending" & pengurutan.
 */
export const getTrackPickCounts = cache(async function getTrackPickCounts(): Promise<
  Record<string, number>
> {
  try {
    const rows = await db
      .select({
        tid: sql<string>`elem->'props'->>'track_id'`,
        n: sql<number>`count(*)::int`,
      })
      .from(invitations)
      .innerJoin(
        sql`jsonb_array_elements(${invitations.sections}) as elem`,
        sql`true`,
      )
      .where(
        sql`${invitations.status} = 'published' and elem->>'type' = 'music' and elem->'props'->>'track_id' is not null`,
      )
      .groupBy(sql`elem->'props'->>'track_id'`);
    return Object.fromEntries(rows.map((r) => [r.tid, r.n]));
  } catch {
    return {};
  }
});
