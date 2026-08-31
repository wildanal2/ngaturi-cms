import type { CSSProperties } from "react";
import { getVariant } from "@/sections/registry";
import { Reveal } from "@/sections/reveal";
import type { GlobalSettings, SectionData } from "@/sections/types";

const FONT_STACK: Record<string, string> = {
  Fraunces: "var(--font-fraunces), Georgia, serif",
  Inter: "var(--font-inter), system-ui, sans-serif",
  Cormorant: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  Parisienne: "var(--font-parisienne), 'Segoe Script', 'Brush Script MT', cursive",
};

export function invitationRootStyle(global: GlobalSettings): CSSProperties {
  return {
    "--inv-primary": global.color_primary,
    "--inv-secondary": global.color_secondary,
    "--inv-bg": global.color_background,
    "--inv-ink": "#2c2723",
    "--inv-font": FONT_STACK[global.font_family] ?? FONT_STACK.Fraunces,
    backgroundColor: global.color_background,
  } as CSSProperties;
}

export function InvitationRenderer({
  sections,
  global,
  invitationId,
  guestName,
  isPreview = false,
}: {
  sections: SectionData[];
  global: GlobalSettings;
  invitationId?: string;
  guestName?: string | null;
  isPreview?: boolean;
}) {
  const ordered = [...sections]
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order);
  const siblingTypes = ordered.map((s) => s.type);

  // fixed-position chrome must live outside the animated flow: a wrapper
  // running a CSS transform becomes the containing block for position:fixed.
  const OVERLAY = new Set(["cover", "music", "navigation"]);

  return (
    <div className="mx-auto max-w-lg" style={invitationRootStyle(global)}>
      {ordered.map((section, i) => {
        const variant = getVariant(section.type, section.variant);
        if (!variant) return null;
        const Component = variant.component;
        const node = (
          <div data-section={section.type}>
            <Component
              props={section.props}
              global={global}
              invitationId={invitationId}
              guestName={guestName}
              isPreview={isPreview}
              siblingTypes={siblingTypes}
            />
          </div>
        );
        if (OVERLAY.has(section.type)) {
          return <div key={section.id}>{node}</div>;
        }
        return (
          <Reveal
            key={section.id}
            animation={global.animation}
            immediate={i === 0}
          >
            {node}
          </Reveal>
        );
      })}
    </div>
  );
}
