import type { SectionData } from "@/sections/types";

type SectionLike = Pick<SectionData, "type" | "props">;

export type CardVisual = {
  background?: string;
  foreground?: string;
  ornamentLeft?: string;
  ornamentRight?: string;
  seal?: string;
};

const image = (value: unknown): string | undefined =>
  typeof value === "string" &&
  (/^https?:\/\//.test(value) || value.startsWith("/"))
    ? value
    : undefined;

const section = (sections: readonly SectionLike[], type: string) =>
  sections.find((item) => item.type === type)?.props ?? {};

/**
 * Pull the most characteristic visual assets from an invitation composition.
 * Both template cards and published-invitation OG cards use this so their
 * previews represent the invitation a visitor will actually open.
 */
export function getCardVisual(sections: readonly SectionLike[]): CardVisual {
  const cover = section(sections, "cover");
  const hero = section(sections, "hero");
  const couple = section(sections, "couple-intro");

  const background =
    image(cover.background_image) ?? image(hero.background_image);
  const foreground =
    image(hero.couple_image) ??
    image(couple.divider_image) ??
    image((couple.bride as Record<string, unknown> | undefined)?.photo) ??
    image((couple.groom as Record<string, unknown> | undefined)?.photo) ??
    (background === image(hero.background_image)
      ? undefined
      : image(hero.background_image));

  return {
    background,
    foreground,
    ornamentLeft:
      image(hero.flower_left_image) ?? image(couple.flower_left_image),
    ornamentRight:
      image(hero.flower_right_image) ?? image(couple.flower_right_image),
    seal: image(cover.seal_image),
  };
}

const SATORI_PNG_ASSETS: Record<string, string> = {
  "/themes/navy-elegan/bg-watercolor.webp":
    "/themes/navy-elegan/card-bg-watercolor.png",
  "/themes/navy-elegan/couple-illustration.webp":
    "/themes/navy-elegan/card-couple-illustration.png",
  "/themes/navy-elegan/flower-column-left.webp":
    "/themes/navy-elegan/card-flower-column-left.png",
  "/themes/navy-elegan/flower-column-right.webp":
    "/themes/navy-elegan/card-flower-column-right.png",
};

/** Resolve only local paths or an explicitly trusted external asset prefix. */
export function cardImageUrl(
  value: string | undefined,
  origin: string,
  trustedExternalPrefixes: string | readonly string[] = [],
): string | undefined {
  if (!value) return undefined;
  const source = SATORI_PNG_ASSETS[value] ?? value;
  if (
    source !== source.trim() ||
    /[\\\u0000-\u001f\u007f]/.test(source) ||
    /%(?![0-9a-fA-F]{2})/.test(source)
  )
    return undefined;
  if (source.startsWith("/")) {
    // Static asset paths do not need percent escapes; reject encoded separators
    // and nested encodings before a downstream URL parser can reinterpret them.
    if (
      source.startsWith("//") ||
      source.includes("%") ||
      /\/\.{1,2}(?:\/|$|[?#])/.test(source)
    ) {
      return undefined;
    }
    try {
      const base = new URL(origin);
      const candidate = new URL(source, base);
      return ["http:", "https:"].includes(base.protocol) &&
        !base.username &&
        !base.password &&
        candidate.origin === base.origin
        ? candidate.toString()
        : undefined;
    } catch {
      return undefined;
    }
  }
  const prefixes =
    typeof trustedExternalPrefixes === "string"
      ? [trustedExternalPrefixes]
      : trustedExternalPrefixes;
  try {
    const candidate = new URL(source);
    if (
      !["http:", "https:"].includes(candidate.protocol) ||
      candidate.username ||
      candidate.password
    ) {
      return undefined;
    }
    const trusted = prefixes.some((prefix) => {
      const base = new URL(`${prefix.replace(/\/$/, "")}/`);
      return (
        candidate.origin === base.origin &&
        candidate.pathname.startsWith(base.pathname)
      );
    });
    return trusted ? source : undefined;
  } catch {
    return undefined;
  }
}
