import { ImageResponse } from "next/og";
import {
  getPublicInvitation,
  invitationSummary,
} from "@/lib/invitation/query";
import { env } from "@/lib/env";

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

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const inv = await getPublicInvitation(slug);
  const g = inv?.global;
  const primary = g?.color_primary ?? "#34503f";
  const secondary = g?.color_secondary ?? "#7a2e3c";
  const bg = g?.color_background ?? "#fbf8f3";

  const summary = inv ? invitationSummary(inv) : null;
  const cover = inv?.sections.find((s) => s.type === "cover");
  const hero = inv?.sections.find((s) => s.type === "hero");

  const names = safe(summary?.names ?? "", "Undangan Digital");
  const tagline = safe(
    (cover?.props?.tagline as string) ??
      (hero?.props?.tagline as string) ??
      "",
    "Undangan",
  );
  const dateText = inv?.eventDate
    ? new Date(inv.eventDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  // Only embed a photo the couple actually uploaded (on our CDN). Satori
  // fetches this URL synchronously while rendering — a slow/unreachable
  // third-party placeholder host (picsum, etc.) would hang the response.
  const cdn = env.S3_PUBLIC_URL.replace(/\/$/, "");
  const photo = summary?.photo?.startsWith(cdn) ? summary.photo : null;

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            background: bg,
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt=""
              width={540}
              height={630}
              style={{ objectFit: "cover", height: "100%", width: 540 }}
            />
          ) : null}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 64,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 26,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: secondary,
              }}
            >
              {tagline}
            </div>
            <div
              style={{
                fontSize: photo ? 72 : 92,
                lineHeight: 1.05,
                color: primary,
                margin: "22px 0",
              }}
            >
              {names}
            </div>
            <div style={{ width: 120, height: 2, background: secondary }} />
            {dateText ? (
              <div style={{ fontSize: 30, color: primary, marginTop: 22 }}>
                {dateText}
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                bottom: 34,
                fontSize: 20,
                color: secondary,
                opacity: 0.7,
              }}
            >
              ngaturi.com
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  } catch {
    // last-resort card: solid colour + name only
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: primary,
            color: "#fff",
            fontSize: 72,
            textAlign: "center",
            padding: 80,
          }}
        >
          {names}
        </div>
      ),
      { ...size },
    );
  }
}
