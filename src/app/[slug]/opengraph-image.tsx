import { ImageResponse } from "next/og";
import { getPublicInvitation } from "@/lib/invitation/query";

export const alt = "Undangan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

  const hero = inv?.sections.find((s) => s.type === "hero");
  const names =
    (hero?.props?.couple_names as string) ?? inv?.eventTitle ?? "Undangan";
  const tagline = (hero?.props?.tagline as string) ?? "The Wedding Of";
  const dateText = inv?.eventDate
    ? new Date(inv.eventDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const photo =
    typeof hero?.props?.background_image === "string" &&
    hero.props.background_image.startsWith("http")
      ? (hero.props.background_image as string)
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: bg,
          fontFamily: "Georgia, serif",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            width={520}
            height={630}
            style={{ objectFit: "cover", height: "100%" }}
          />
        ) : null}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
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
              fontSize: photo ? 76 : 96,
              lineHeight: 1.05,
              color: primary,
              marginTop: 24,
              marginBottom: 24,
            }}
          >
            {names}
          </div>
          <div style={{ width: 120, height: 2, background: secondary }} />
          <div style={{ fontSize: 30, color: primary, marginTop: 24 }}>
            {dateText}
          </div>
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
}
