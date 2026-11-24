/* eslint-disable @next/next/no-img-element -- Satori renders plain <img>; next/image does not apply to ImageResponse. */
import type { CSSProperties, ReactElement } from "react";
import { nameFontSize, readableInk, type OgHero } from "./og-hero";

/**
 * Static 1200×630 social card for the OPENED invitation. Satori-safe: flex
 * only, no animation, no runtime screenshot. Safe area: 64px side padding and
 * names that scale with length keep text inside the centre band WhatsApp keeps
 * when it crops previews to a square.
 */
export type OgCardAssets = {
  photo?: string;
  backdrop?: string;
  ornamentLeft?: string;
  ornamentRight?: string;
};

export type OgCardProps = {
  hero: OgHero;
  assets: OgCardAssets;
  names: string;
  tagline: string;
  dateText: string;
  colors: { primary: string; secondary: string; background: string };
  fontFamily?: string;
};

const W = 1200;
const H = 630;
const abs = (style: CSSProperties): CSSProperties => ({
  position: "absolute",
  display: "flex",
  ...style,
});

function Copy({
  names,
  tagline,
  dateText,
  ink,
  accent,
  maxWidth,
  base = 92,
  shadow = false,
}: {
  names: string;
  tagline: string;
  dateText: string;
  ink: string;
  accent: string;
  maxWidth: number;
  base?: number;
  shadow?: boolean;
}) {
  // Satori throws on an undefined textShadow, so only spread it when set.
  const glow: CSSProperties = shadow
    ? { textShadow: "0 2px 14px rgba(0,0,0,.55)" }
    : {};
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        maxWidth,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 24,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: accent,
          ...glow,
        }}
      >
        {tagline}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: nameFontSize(names, base),
          lineHeight: 1.08,
          color: ink,
          margin: "22px 0",
          ...glow,
        }}
      >
        {names}
      </div>
      <div
        style={{ display: "flex", width: 120, height: 2, background: accent }}
      />
      {dateText ? (
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 2,
            color: ink,
            marginTop: 22,
            ...glow,
          }}
        >
          {dateText}
        </div>
      ) : null}
    </div>
  );
}

function Brand({ color }: { color: string }) {
  return (
    <div
      style={abs({
        bottom: 26,
        left: 0,
        width: W,
        justifyContent: "center",
        fontSize: 20,
        color,
        opacity: 0.75,
      })}
    >
      ngaturi.com
    </div>
  );
}

export function ogCard(p: OgCardProps): ReactElement {
  const { hero, assets, colors } = p;
  const bg = hero.dark ? "#0b0f0c" : colors.background;
  const ink = readableInk(colors.primary, bg);
  const accent = readableInk(colors.secondary, bg);
  const shell: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    position: "relative",
    overflow: "hidden",
    background: bg,
    // Satori throws on undefined style values, so only set fontFamily when loaded.
    ...(p.fontFamily ? { fontFamily: p.fontFamily } : {}),
  };
  const copy = (
    maxWidth: number,
    color = ink,
    tone = accent,
    shadow = false,
  ) => (
    <Copy
      names={p.names}
      tagline={p.tagline}
      dateText={p.dateText}
      ink={color}
      accent={tone}
      maxWidth={maxWidth}
      base={maxWidth < 700 ? 76 : 92}
      shadow={shadow}
    />
  );

  if (hero.layout === "fullscreen" && assets.photo) {
    return (
      <div style={{ ...shell, background: colors.primary }}>
        <img
          src={assets.photo}
          alt=""
          width={W}
          height={H}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            objectFit: "cover",
            objectPosition: hero.position,
          }}
        />
        <div
          style={abs({
            top: 0,
            left: 0,
            width: W,
            height: H,
            background:
              "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.58) 50%, rgba(0,0,0,.85) 100%)",
          })}
        />
        <div
          style={abs({
            top: 0,
            left: 0,
            width: W,
            height: H,
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px",
          })}
        >
          {copy(W - 128, "#ffffff", "#f3e3bf", true)}
        </div>
        <Brand color="#ffffff" />
      </div>
    );
  }

  if ((hero.layout === "split" || hero.layout === "framed") && assets.photo) {
    const left = hero.photoSide === "left";
    const framed = hero.layout === "framed";
    const arch = hero.variant === "arch";
    const photo = framed ? (
      <div
        style={{
          width: 500,
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            padding: 10,
            border: `3px solid ${accent}`,
            borderRadius: arch ? "190px 190px 8px 8px" : 8,
          }}
        >
          <img
            src={assets.photo}
            alt=""
            width={340}
            height={470}
            style={{
              width: 340,
              height: 470,
              objectFit: "cover",
              objectPosition: hero.position,
              borderRadius: arch ? "180px 180px 2px 2px" : 2,
            }}
          />
        </div>
      </div>
    ) : (
      <div
        style={{ width: 500, height: H, display: "flex", position: "relative" }}
      >
        <img
          src={assets.photo}
          alt=""
          width={500}
          height={H}
          style={{
            width: 500,
            height: H,
            objectFit: "cover",
            objectPosition: hero.position,
          }}
        />
      </div>
    );
    const textPanel = (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 56px",
        }}
      >
        {copy(560)}
      </div>
    );
    return (
      <div style={shell}>
        {left ? photo : textPanel}
        {left ? textPanel : photo}
        <Brand color={accent} />
      </div>
    );
  }

  if (hero.layout === "illustration" && assets.photo) {
    return (
      <div style={shell}>
        {assets.backdrop ? (
          <img
            src={assets.backdrop}
            alt=""
            width={W}
            height={H}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: W,
              height: H,
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            width: 520,
            height: H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={assets.photo}
            alt=""
            width={440}
            height={560}
            style={{ width: 440, height: 560, objectFit: "contain" }}
          />
        </div>
        {assets.ornamentLeft ? (
          <img
            src={assets.ornamentLeft}
            alt=""
            width={140}
            height={260}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 140,
              height: 260,
              objectFit: "contain",
            }}
          />
        ) : null}
        {assets.ornamentRight ? (
          <img
            src={assets.ornamentRight}
            alt=""
            width={140}
            height={260}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 140,
              height: 260,
              objectFit: "contain",
            }}
          />
        ) : null}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 64px 40px 16px",
          }}
        >
          {copy(560)}
        </div>
        <Brand color={accent} />
      </div>
    );
  }

  // Typographic (and every no-photo fallback): palette, hairline frame, ornaments.
  return (
    <div
      style={{
        ...shell,
        alignItems: "center",
        justifyContent: "center",
        background: hero.dark
          ? `radial-gradient(120% 90% at 50% 0%, ${colors.primary} 0%, #0b0f0c 70%)`
          : bg,
      }}
    >
      {assets.backdrop ? (
        <img
          src={assets.backdrop}
          alt=""
          width={W}
          height={H}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            objectFit: "cover",
            opacity: 0.5,
          }}
        />
      ) : null}
      <div
        style={abs({
          top: 26,
          left: 26,
          width: W - 52,
          height: H - 52,
          border: `2px solid ${accent}`,
          opacity: 0.55,
        })}
      />
      {assets.ornamentLeft ? (
        <img
          src={assets.ornamentLeft}
          alt=""
          width={170}
          height={300}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 170,
            height: 300,
            objectFit: "contain",
          }}
        />
      ) : null}
      {assets.ornamentRight ? (
        <img
          src={assets.ornamentRight}
          alt=""
          width={170}
          height={300}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 170,
            height: 300,
            objectFit: "contain",
          }}
        />
      ) : null}
      {copy(W - 380, hero.dark ? "#fffdf8" : ink, accent)}
      <Brand color={accent} />
    </div>
  );
}
