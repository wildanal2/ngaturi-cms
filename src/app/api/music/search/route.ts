import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { getMusicCatalog } from "@/lib/music/queries";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

interface Result {
  id: string;
  title: string;
  artist: string | null;
  audioUrl: string;
  coverUrl: string | null;
  license: string | null;
  genre: string | null;
  source: "catalog" | "jamendo";
  shareUrl?: string | null;
}

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  audio: string;
  image: string;
  license_ccurl?: string;
  shareurl?: string;
  musicinfo?: { tags?: { genres?: string[] } };
}

/** GET /api/music/search?q=... — filters our catalog + (if configured) Jamendo. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [], provider: providerName() });
  }

  const needle = q.toLowerCase();
  const catalog = await getMusicCatalog();
  const local: Result[] = catalog
    .filter((t) =>
      [t.title, t.artist, t.genre]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle)),
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      audioUrl: t.audioUrl,
      coverUrl: t.coverUrl,
      license: t.license,
      genre: t.genre,
      source: "catalog" as const,
    }));

  let remote: Result[] = [];
  if (env.JAMENDO_CLIENT_ID) {
    try {
      remote = await searchJamendo(q);
    } catch {
      remote = [];
    }
  }

  return NextResponse.json({
    results: [...local, ...remote],
    provider: providerName(),
  });
}

function providerName(): string | null {
  return env.JAMENDO_CLIENT_ID ? "Jamendo" : null;
}

async function searchJamendo(q: string): Promise<Result[]> {
  // "Perfect – Ed Sheeran" / "A Thousand Years - Christina Perri" → "Perfect"
  const cleaned =
    q.split(/\s+[–—-]\s+|\s+\bby\b\s+/i)[0].trim() || q;

  const url = new URL("https://api.jamendo.com/v3.0/tracks");
  url.searchParams.set("client_id", env.JAMENDO_CLIENT_ID!);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "30");
  url.searchParams.set("search", cleaned);
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("include", "musicinfo licenses");
  url.searchParams.set("boost", "popularity_total");
  url.searchParams.set("audiodlformat", "mp32");

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`jamendo ${res.status}`);
  const data = (await res.json()) as { results?: JamendoTrack[] };
  return (data.results ?? [])
    .filter((t) => t.audio)
    .map((t) => ({
      id: `jamendo:${t.id}`,
      title: t.name,
      artist: t.artist_name || null,
      audioUrl: t.audio,
      coverUrl: t.image || null,
      license: "Jamendo · CC",
      genre: t.musicinfo?.tags?.genres?.[0] ?? null,
      source: "jamendo" as const,
      shareUrl: t.shareurl ?? t.license_ccurl ?? null,
    }));
}
