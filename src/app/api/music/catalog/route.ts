import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { getMusicCatalog, getTrackPickCounts } from "@/lib/music/queries";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [tracks, picks] = await Promise.all([
    getMusicCatalog(),
    getTrackPickCounts(),
  ]);
  const withPicks = tracks
    .map((t) => ({ ...t, picks: picks[t.id] ?? 0 }))
    .sort((a, b) => b.picks - a.picks);
  return NextResponse.json({ tracks: withPicks });
}
