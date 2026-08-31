import { ImageResponse } from "next/og";
import { getTemplate } from "@/lib/templates/catalog";

export const runtime = "nodejs";
// Templates are defined in code — the card only changes on deploy.
export const revalidate = 86400;

const W = 600;
const H = 800;

/** Satori only shapes Latin reliably — strip the rest. */
function safe(text: string, fallback: string): string {
  const cleaned = (text ?? "")
    .replace(/[^\p{Script=Latin}\p{Number}\p{Punctuation}\s&'’.,:/-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const t = getTemplate(id);
  if (!t) return new Response("not found", { status: 404 });

  const g = t.global_settings;
  const cover = t.sections.find((s) => s.type === "cover");
  const hero = t.sections.find((s) => s.type === "hero");
  const names = safe(
    (cover?.props?.names as string) ??
      (hero?.props?.couple_names as string) ??
      "",
    "Nama Mempelai",
  );
  const tagline = safe(
    (cover?.props?.tagline as string) ??
      (hero?.props?.tagline as string) ??
      "",
    "The Wedding Of",
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: g.color_background,
          position: "relative",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* ornamental frame */}
        <div
          style={{
            position: "absolute",
            inset: 34,
            border: `2px solid ${g.color_secondary}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 44,
            border: `1px solid ${g.color_secondary}`,
            opacity: 0.35,
          }}
        />

        <div
          style={{
            fontSize: 22,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: g.color_secondary,
          }}
        >
          {tagline}
        </div>

        {/* photo circle placeholder */}
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 999,
            margin: "34px 0",
            border: `5px solid ${g.color_secondary}`,
            background: `linear-gradient(135deg, ${g.color_primary}, ${g.color_secondary})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 40,
          }}
        >
          ♥
        </div>

        <div
          style={{
            fontSize: 58,
            lineHeight: 1.05,
            color: g.color_primary,
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          {names}
        </div>

        <div
          style={{
            width: 90,
            height: 2,
            background: g.color_secondary,
            margin: "26px 0",
          }}
        />
        <div style={{ fontSize: 22, color: g.color_primary, opacity: 0.85 }}>
          {t.name}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
