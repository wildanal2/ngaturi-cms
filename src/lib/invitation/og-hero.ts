import type { SectionData } from "@/sections/types";

/**
 * What a social preview should show: the invitation AFTER "Buka Undangan" —
 * the hero, never the cover/opening gate. Pure data selection so it is cheap
 * to test; rendering lives in og-card.tsx. `getCardVisual()` (template catalog
 * thumbnails) is intentionally untouched.
 */
type SectionLike = Pick<SectionData, "type" | "props"> & {
  variant?: string;
  visible?: boolean;
};

export type OgLayout =
  | "fullscreen" // photo edge to edge, names over a scrim
  | "split" // photo and text side by side
  | "framed" // portrait in an arch/heritage frame beside the text
  | "illustration" // watercolor backdrop + couple illustration + florals
  | "typographic"; // palette + ornaments + names, no photo

export type OgHero = {
  layout: OgLayout;
  variant?: string;
  /** Primary photo (hero only — never cover.background_image). */
  photo?: string;
  /** Soft backdrop painted behind everything (illustration layout). */
  backdrop?: string;
  ornamentLeft?: string;
  ornamentRight?: string;
  photoSide: "left" | "right";
  /** CSS object-position, validated. */
  position: string;
  /** Dark editorial palette (e.g. kana-noir) → light ink on dark. */
  dark: boolean;
  tagline?: string;
  /** Raw hero names, if the hero carries them. */
  names?: string;
};

const GATE_FALLBACK = "/themes/gerbang-puspa/garden-gate.svg";

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Same acceptance rule as card-visual: absolute http(s) or a site path. */
const image = (value: unknown): string | undefined =>
  typeof value === "string" &&
  (/^https?:\/\//.test(value) ||
    (value.startsWith("/") && !value.startsWith("//")))
    ? value
    : undefined;

const POSITION = /^\d{1,3}%(?: \d{1,3}%)?$/;

const FULLSCREEN = new Set(["centered", "sekar-jawa-3d", "gerbang-puspa"]);
const SPLIT = new Set(["split", "serambi-delima", "lakon-kencana"]);
const FRAMED = new Set(["arch", "cinematic-vintage"]);
const ILLUSTRATION = new Set(["garland"]);

/** The section a visitor lands on once the opening is dismissed. */
export function pickOpenedHero(
  sections: readonly SectionLike[],
): SectionLike | undefined {
  return sections.find((s) => s.type === "hero" && s.visible !== false);
}

export function getOgHero(sections: readonly SectionLike[]): OgHero {
  const hero = pickOpenedHero(sections);
  const props = (hero?.props ?? {}) as Record<string, unknown>;
  const variant = hero?.variant;
  const couple = (sections.find(
    (s) => s.type === "couple-intro" && s.visible !== false,
  )?.props ?? {}) as Record<string, unknown>;

  const base = {
    variant,
    photoSide: props.s_photo_side === "right" ? "right" : "left",
    position: POSITION.test(String(props.photo_position ?? ""))
      ? String(props.photo_position)
      : "50% 35%",
    dark: props.s_palette === "noir",
    tagline: text(props.tagline),
    names: text(props.couple_names),
    ornamentLeft:
      image(props.flower_left_image) ?? image(couple.flower_left_image),
    ornamentRight:
      image(props.flower_right_image) ?? image(couple.flower_right_image),
  } satisfies Partial<OgHero>;

  const typographic = (): OgHero => ({ ...base, layout: "typographic" });

  if (!hero || !variant) return typographic();

  if (ILLUSTRATION.has(variant)) {
    const photo = image(props.couple_image);
    return photo
      ? {
          ...base,
          layout: "illustration",
          photo,
          backdrop: image(props.background_image),
        }
      : { ...typographic(), backdrop: image(props.background_image) };
  }

  const photo = image(props.background_image) ?? image(props.couple_image);

  if (FULLSCREEN.has(variant)) {
    if (photo) return { ...base, layout: "fullscreen", photo };
    // The gate artwork is the hero scene even when no film/photo is supplied.
    if (variant === "gerbang-puspa")
      return { ...base, layout: "fullscreen", photo: GATE_FALLBACK };
    return typographic();
  }
  if (SPLIT.has(variant)) {
    return photo ? { ...base, layout: "split", photo } : typographic();
  }
  if (FRAMED.has(variant)) {
    return photo ? { ...base, layout: "framed", photo } : typographic();
  }
  // minimal, botanical, floating17 and unknown/custom variants.
  return typographic();
}

/* ---------- readable colour ---------- */

function rgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const c = rgb(hex);
  if (!c) return 1;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Keep the template's own colour when legible, else a safe light/dark ink. */
export function readableInk(preferred: string, background: string): string {
  if (rgb(preferred) && contrast(preferred, background) >= 4.5)
    return preferred;
  return contrast("#fffdf8", background) >= contrast("#1b1612", background)
    ? "#fffdf8"
    : "#1b1612";
}

/** Names scale down with length so long couples never clip the safe area. */
export function nameFontSize(names: string, base = 92): number {
  const n = names.length;
  const size =
    n <= 14
      ? base
      : n <= 22
        ? base * 0.82
        : n <= 32
          ? base * 0.66
          : n <= 44
            ? base * 0.54
            : base * 0.46;
  return Math.round(size);
}
