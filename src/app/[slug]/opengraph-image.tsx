import { ImageResponse } from "next/og";
import { getPublicInvitation, invitationSummary } from "@/lib/invitation/query";
import { getOgHero } from "@/lib/invitation/og-hero";
import { ogCard, type OgCardAssets } from "@/lib/invitation/og-card";
import { trustedPublicMediaPrefixes } from "@/lib/storage";
import { isInvitationPubliclyActive } from "@/lib/invitation/visibility";
import { canonicalApplicationOrigin } from "@/lib/security/origin";
import { fetchOgImageData } from "@/lib/security/og-image";
import { fitOgImage, satoriImage } from "@/lib/invitation/og-compress";

export const alt = "Undangan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Regenerate at most every 5 min — the card only changes when the couple
// edit their cover photo / names, which is rare. Keeps Satori renders off
// the hot path for social-media crawlers.
export const revalidate = 300;

/** Satori (next/og) only shapes Latin reliably — strip the rest. */
function safe(text: string, fallback = ""): string {
  const cleaned = (text ?? "")
    .replace(/[^\p{Script=Latin}\p{Number}\p{Punctuation}\s&'’.,:/-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

const OG_FONT_PATH = "/themes/gerbang-puspa/fonts/Marcellus-Regular.ttf";

/** Elegant Latin serif shipped with the app; any failure falls back to the default font. */
async function loadOgFont(origin: string): Promise<ArrayBuffer | undefined> {
  try {
    const res = await fetch(new URL(OG_FONT_PATH, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const data = await res.arrayBuffer();
    // TrueType magic: 0x00010000 or "true".
    const head = new Uint8Array(data.slice(0, 4));
    const ttf =
      head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0;
    return ttf && data.byteLength < 1024 * 1024 ? data : undefined;
  } catch {
    return undefined;
  }
}

/** Photo-heavy cards are re-encoded to stay under WhatsApp's thumbnail limit. */
export default async function OgImage(props: {
  params: Promise<{ slug: string }>;
}) {
  return fitOgImage(await renderCard(props));
}

async function renderCard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loadedInvitation = await getPublicInvitation(slug);
  const inv =
    loadedInvitation && isInvitationPubliclyActive(loadedInvitation)
      ? loadedInvitation
      : null;
  const g = inv?.global;
  const colors = {
    primary: g?.color_primary ?? "#34503f",
    secondary: g?.color_secondary ?? "#7a2e3c",
    background: g?.color_background ?? "#fbf8f3",
  };

  const summary = inv ? invitationSummary(inv) : null;
  const cover = inv?.sections.find((s) => s.type === "cover");
  // The preview shows the opened invitation (hero), never the cover/gate.
  const sections = inv?.sections ?? [];
  const hero = getOgHero(sections);

  // Names as shown in the opened hero, then the invitation summary.
  const names = safe(
    hero.names ?? summary?.names ?? "",
    "Undangan Digital",
  ).slice(0, 64);
  const tagline = safe(
    hero.tagline ?? (cover?.props?.tagline as string) ?? "",
    "Undangan",
  );
  const dateText = inv?.eventDate
    ? new Date(inv.eventDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const mediaPrefixes = trustedPublicMediaPrefixes();
  const origin = canonicalApplicationOrigin();
  const fontPromise = loadOgFont(origin);
  const [photo, backdrop, ornamentLeft, ornamentRight] = await Promise.all(
    [hero.photo, hero.backdrop, hero.ornamentLeft, hero.ornamentRight].map(
      async (src) =>
        satoriImage(await fetchOgImageData(src, origin, mediaPrefixes)),
    ),
  );
  const font = await fontPromise;
  const fonts = font
    ? [
        {
          name: "OgSerif",
          data: font,
          weight: 400 as const,
          style: "normal" as const,
        },
      ]
    : undefined;
  const card = (assets: OgCardAssets) =>
    new ImageResponse(
      ogCard({
        hero,
        assets,
        names,
        tagline,
        dateText,
        colors,
        fontFamily: fonts ? "OgSerif" : undefined,
      }),
      { ...size, fonts },
    );

  // ImageResponse decodes images lazily while streaming, so a corrupt photo
  // only fails when the body is read — settle it here to be able to fall back.
  const settle = async (res: Response) =>
    new Response(await res.arrayBuffer(), {
      status: res.status,
      headers: res.headers,
    });
  try {
    return await settle(card({ photo, backdrop, ornamentLeft, ornamentRight }));
  } catch {
    try {
      // Elegant fallback: palette + names only.
      return await settle(card({}));
    } catch {
      // last-resort card: solid colour + name only
      return new ImageResponse(
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: colors.primary,
            color: "#fff",
            fontSize: 72,
            textAlign: "center",
            padding: 80,
          }}
        >
          {names}
        </div>,
        { ...size },
      );
    }
  }
}
