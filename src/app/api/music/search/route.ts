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
  source: "catalog" | "deezer" | "itunes" | "jamendo";
  previewOnly?: boolean;
  linkUrl?: string | null;
}

/** GET /api/music/search?q=... — our catalog + iTunes previews + (opt) Jamendo. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [], sources: [] });
  }

  const guard = (name: string) => (e: unknown) => {
    console.error(`[music/search] ${name}`, e);
    return [] as Result[];
  };

  const [local, deezer, itunes, jamendo] = await Promise.all([
    searchCatalog(q),
    searchDeezer(q).catch(guard("deezer")),
    searchItunes(q).catch(guard("itunes")),
    env.JAMENDO_CLIENT_ID
      ? searchJamendo(q).catch(guard("jamendo"))
      : Promise.resolve([] as Result[]),
  ]);

  // de-dupe commercial previews (title+artist appears on both deezer & itunes)
  const seen = new Set<string>();
  const commercial = [...deezer, ...itunes].filter((t) => {
    const k = `${t.title}|${t.artist}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return NextResponse.json({
    results: [...local, ...commercial, ...jamendo],
    sources: [
      ...(local.length ? ["Katalog"] : []),
      ...(deezer.length ? ["Deezer"] : []),
      ...(itunes.length ? ["iTunes"] : []),
      ...(jamendo.length ? ["Jamendo"] : []),
    ],
  });
}

async function searchCatalog(q: string): Promise<Result[]> {
  const needle = q.toLowerCase();
  const catalog = await getMusicCatalog();
  return catalog
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
}

interface DeezerTrack {
  id: number;
  title: string;
  preview?: string;
  artist?: { name?: string };
  album?: { cover_medium?: string; cover_big?: string };
}

async function searchDeezer(q: string): Promise<Result[]> {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(
    q,
  )}&limit=15`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`deezer ${res.status}`);
  const data = (await res.json()) as { data?: DeezerTrack[] };
  return (data.data ?? [])
    .filter((t) => t.preview)
    .map((t) => ({
      id: `deezer:${t.id}`,
      title: t.title,
      artist: t.artist?.name ?? null,
      audioUrl: t.preview!,
      coverUrl: t.album?.cover_big ?? t.album?.cover_medium ?? null,
      license: "Cuplikan 30 dtk",
      genre: null,
      source: "deezer" as const,
      previewOnly: true,
    }));
}

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  trackViewUrl?: string;
}

async function searchItunes(q: string): Promise<Result[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    q,
  )}&entity=song&limit=20`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`itunes ${res.status}`);
  const data = (await res.json()) as { results?: ItunesTrack[] };
  return (data.results ?? [])
    .filter((t) => t.previewUrl)
    .map((t) => ({
      id: `itunes:${t.trackId}`,
      title: t.trackName,
      artist: t.artistName ?? null,
      audioUrl: t.previewUrl!,
      coverUrl: (t.artworkUrl100 ?? "").replace("100x100bb", "400x400bb") || null,
      license: "Cuplikan 30 dtk",
      genre: t.primaryGenreName ?? null,
      source: "itunes" as const,
      previewOnly: true,
      linkUrl: t.trackViewUrl ?? null,
    }));
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

async function searchJamendo(q: string): Promise<Result[]> {
  // "Perfect – Ed Sheeran" / "A Thousand Years - Christina Perri" → "Perfect"
  const cleaned = q.split(/\s+[–—-]\s+|\s+\bby\b\s+/i)[0].trim() || q;

  const url = new URL("https://api.jamendo.com/v3.0/tracks");
  url.searchParams.set("client_id", env.JAMENDO_CLIENT_ID!);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "30");
  url.searchParams.set("search", cleaned);
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("include", "musicinfo");
  url.searchParams.set("boost", "popularity_total");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
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
      linkUrl: t.shareurl ?? t.license_ccurl ?? null,
    }));
}
