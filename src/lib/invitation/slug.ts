import { customAlphabet } from "nanoid";

const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Slug unik: <base>-<6 char acak>. */
export function makeSlug(base: string): string {
  const b = slugify(base) || "undangan";
  return `${b}-${nano()}`;
}

/** Nama tautan yang tidak boleh dipakai (bentrok dengan rute aplikasi). */
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "builder",
  "dashboard",
  "invitations",
  "login",
  "logout",
  "media",
  "payment",
  "pricing",
  "settings",
  "templates",
  "legal",
  "undangan-terbaru",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "icon",
  "apple-icon",
  "opengraph-image",
  "_next",
  "undangan",
  "ngaturi",
]);

/**
 * Validasi & normalisasi slug pilihan pengguna. Return `{ slug }` bila
 * valid, atau `{ error }`.
 */
export function validateCustomSlug(
  raw: string,
): { slug: string } | { error: string } {
  const slug = slugify(raw);
  if (slug.length < 3) {
    return { error: "Minimal 3 karakter (huruf/angka)." };
  }
  if (slug.length > 40) {
    return { error: "Maksimal 40 karakter." };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { error: "Hanya huruf kecil, angka, dan tanda hubung." };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { error: "Nama tautan itu sudah dipakai sistem, pilih yang lain." };
  }
  return { slug };
}
