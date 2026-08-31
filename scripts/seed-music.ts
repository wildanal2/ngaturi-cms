/**
 * Seed the music catalog (music_tracks).
 *
 * Downloads each royalty-free track once, rehosts it in our own bucket
 * (music/<slug>.mp3) for production-safe delivery, then upserts the row.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-music.ts
 * Re-run safe (idempotent). Pass --skip-upload to only upsert rows using
 * whatever audioUrl is already stored (or the source URL as a fallback).
 *
 * All tracks: music by Kevin MacLeod (incompetech.com), licensed under
 * Creative Commons: By Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/
 */
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../src/lib/db";
import { musicTracks } from "../src/lib/db/schema";
import { s3, S3_BUCKET, publicUrl } from "../src/lib/storage";

const SKIP_UPLOAD = process.argv.includes("--skip-upload");

const LICENSE = "CC BY 4.0";
const ATTRIBUTION =
  '"{title}" by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/';
const SRC = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/";

interface Seed {
  slug: string;
  title: string;
  file: string; // filename on incompetech (without .mp3)
  genre: string;
  sortOrder: number;
}

const SEEDS: Seed[] = [
  { slug: "canon-in-d", title: "Canon in D", file: "Canon in D Major", genre: "Klasik", sortOrder: 10 },
  { slug: "gymnopedie-no-1", title: "Gymnopédie No. 1", file: "Gymnopedie No 1", genre: "Klasik", sortOrder: 20 },
  { slug: "enchanted-valley", title: "Enchanted Valley", file: "Enchanted Valley", genre: "Romantis", sortOrder: 30 },
  { slug: "fireflies-and-stardust", title: "Fireflies and Stardust", file: "Fireflies and Stardust", genre: "Romantis", sortOrder: 40 },
  { slug: "bittersweet", title: "Bittersweet", file: "Bittersweet", genre: "Akustik", sortOrder: 50 },
  { slug: "silver-flame", title: "Silver Flame", file: "Silver Flame", genre: "Sinematik", sortOrder: 60 },
  { slug: "willow-and-the-light", title: "Willow and the Light", file: "Willow and the Light", genre: "Sinematik", sortOrder: 70 },
  { slug: "water-lily", title: "Water Lily", file: "Water Lily", genre: "Tenang", sortOrder: 80 },
  { slug: "angel-share", title: "Angel Share", file: "Angel Share", genre: "Tenang", sortOrder: 100 },
];

async function rehost(seed: Seed): Promise<string> {
  const key = `music/${seed.slug}.mp3`;
  if (SKIP_UPLOAD) return publicUrl(key);

  const srcUrl = SRC + encodeURIComponent(seed.file) + ".mp3";
  process.stdout.write(`  ↓ ${seed.title} … `);
  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`fetch ${res.status} ${srcUrl}`);
  const body = Buffer.from(await res.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  console.log(`${(body.length / 1024 / 1024).toFixed(1)} MB → ${key}`);
  return publicUrl(key);
}

async function main() {
  console.log(`Seeding ${SEEDS.length} tracks${SKIP_UPLOAD ? " (skip-upload)" : ""}…`);
  for (const seed of SEEDS) {
    const audioUrl = await rehost(seed);
    await db
      .insert(musicTracks)
      .values({
        id: seed.slug,
        title: seed.title,
        artist: "Kevin MacLeod",
        audioUrl,
        coverUrl: null,
        license: LICENSE,
        attribution: ATTRIBUTION.replace("{title}", seed.title),
        genre: seed.genre,
        isActive: true,
        sortOrder: seed.sortOrder,
      })
      .onConflictDoUpdate({
        target: musicTracks.id,
        set: {
          title: seed.title,
          artist: "Kevin MacLeod",
          audioUrl,
          license: LICENSE,
          attribution: ATTRIBUTION.replace("{title}", seed.title),
          genre: seed.genre,
          isActive: true,
          sortOrder: seed.sortOrder,
        },
      });
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
