import type { CSSProperties } from "react";
import { getVariant } from "@/sections/registry";
import { Reveal } from "@/sections/reveal";
import type { GlobalSettings, SectionData } from "@/sections/types";

const FONT_STACK: Record<string, string> = {
  Fraunces: "var(--font-fraunces), Georgia, serif",
  Inter: "var(--font-inter), system-ui, sans-serif",
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

  return (
    <div
      className="mx-auto max-w-lg overflow-hidden"
      style={invitationRootStyle(global)}
    >
      {ordered.map((section, i) => {
        const variant = getVariant(section.type, section.variant);
        if (!variant) return null;
        const Component = variant.component;
        return (
          <Reveal
            key={section.id}
            animation={global.animation}
            immediate={i === 0}
          >
            <div data-section={section.type}>
              <Component
                props={section.props}
                global={global}
                invitationId={invitationId}
                guestName={guestName}
                isPreview={isPreview}
              />
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
