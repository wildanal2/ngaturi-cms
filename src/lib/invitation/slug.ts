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
