import type { CSSProperties, ReactNode } from "react";
import { resolveLoading } from "@/sections/loading/resolve";
import { InvitationLoadingBoundary } from "@/sections/loading/boundary";
import { getVariant } from "@/sections/registry";
import cinematicStyles from "@/sections/cinematic/cinematic.module.css";
import { Reveal } from "@/sections/reveal";
import { CinematicComposition } from "@/sections/cinematic/composition";
import {
  cinematicContent,
  cinematicVariant,
} from "@/sections/cinematic/content";
import { SekarJawa3DComposition } from "./immersive-composition";
import { sekarJawa3DContent } from "@/sections/sekar-jawa-3d/content";
import type { TemplateComposition } from "@/lib/templates/catalog";
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
  composition,
  invitationId,
  guestName,
  isPreview = false,
  opening,
}: {
  sections: SectionData[];
  global: GlobalSettings;
  composition: TemplateComposition;
  invitationId?: string;
  guestName?: string | null;
  isPreview?: boolean;
  /** External legacy Opening participates in the same entry gate. */
  opening?: ReactNode;
}) {
  const ordered = [...sections]
    .filter((s) => s.visible !== false && s.type !== "loading")
    .sort((a, b) => a.order - b.order);
  const siblingTypes =
    composition === "cinematic-vintage"
      ? cinematicContent(ordered, true).siblingTypes
      : ordered.map((s) => s.type);
  let flow = ordered;
  let ownedComposition: ReactNode = null;

  switch (composition) {
    case "standard":
      break;
    case "cinematic-vintage":
      flow = cinematicContent(ordered, true).remaining;
      ownedComposition = (
        <CinematicComposition
          sections={ordered}
          global={global}
          invitationId={invitationId}
          guestName={guestName}
          isPreview={isPreview}
          siblingTypes={siblingTypes}
        />
      );
      break;
    case "sekar-jawa-3d":
      flow = sekarJawa3DContent(ordered).remaining;
      ownedComposition = (
        <SekarJawa3DComposition
          sections={ordered}
          global={global}
          invitationId={invitationId}
          guestName={guestName}
          isPreview={isPreview}
          siblingTypes={siblingTypes}
        />
      );
      break;
  }

  // fixed-position chrome must live outside the animated flow: a wrapper
  // running a CSS transform becomes the containing block for position:fixed.
  const OVERLAY = new Set(["cover", "music", "navigation"]);

  const content = (
    <div
      className={composition === "cinematic-vintage" ? `cinematic-invitation mx-auto max-w-lg ${cinematicStyles.invitationRoot}` : "mx-auto max-w-lg"}
      data-cinematic-public={composition === "cinematic-vintage" || undefined}
      style={invitationRootStyle(global)}
    >
      {ownedComposition}
      {flow.map((section, i) => {
        const variant = getVariant(
          section.type,
          composition === "cinematic-vintage"
            ? cinematicVariant(section)
            : section.variant,
        );
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
  const loading = resolveLoading(sections, composition);
  if (!loading) return <>{opening}{content}</>;
  const variant = getVariant("loading", loading.variant);
  if (!variant) return <>{opening}{content}</>;
  const LoadingVisual = variant.component;
  const names =
    sections.find((section) => section.type === "cover" && section.visible !== false)?.props.names ??
    sections.find((section) => section.type === "hero" && section.visible !== false)?.props.couple_names;
  return (
    <InvitationLoadingBoundary
      profile={loading.variant}
      visual={
        <LoadingVisual
          props={{ ...loading.props, names }}
          global={global}
          isPreview={isPreview}
        />
      }
    >
      {opening}
      {content}
    </InvitationLoadingBoundary>
  );
}
