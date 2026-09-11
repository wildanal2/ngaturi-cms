import type { CSSProperties } from "react";
import { getVariant } from "../registry";
import type { GlobalSettings, SectionData } from "../types";
import { enchantedGardenContent } from "./content";
import styles from "./enchanted-garden.module.css";
import { ENCHANTED_GARDEN_JOURNEY } from "./journey";
import { EnchantedGardenStage } from "./stage";
import type { SceneQuality } from "./types";

export function EnchantedGardenComposition({
  sections,
  global,
  invitationId,
  guestName,
  isPreview,
  siblingTypes,
  quality = "medium",
}: {
  sections: SectionData[];
  global: GlobalSettings;
  invitationId?: string;
  guestName?: string | null;
  isPreview?: boolean;
  siblingTypes?: string[];
  quality?: SceneQuality;
}) {
  const { journey, eventDate } = enchantedGardenContent(sections);

  return (
    <EnchantedGardenStage quality={quality}>
      {ENCHANTED_GARDEN_JOURNEY.map((stop) => {
        if (!("section" in stop) || !(stop.section in journey)) return null;
        const section = journey[stop.section as keyof typeof journey];
        if (!section) return null;
        const variant = getVariant(section.type, section.variant);
        if (!variant) return null;
        const Component = variant.component;
        const derivedProps =
          eventDate && section.type === "hero"
            ? { ...section.props, event_date: eventDate }
            : eventDate && section.type === "countdown"
              ? { ...section.props, target_date: eventDate }
              : section.props;
        const rangeStyle = {
          "--journey-start": `${stop.range[0] * 100}%`,
          "--journey-span": `${(stop.range[1] - stop.range[0]) * 100}%`,
        } as CSSProperties;

        return (
          <div
            key={section.id}
            className={styles.contentStop}
            style={rangeStyle}
            data-journey-stop={stop.id}
          >
            <div
              className={
                section.type === "cover"
                  ? styles.coverContent
                  : styles.contentCard
              }
              data-section={section.type}
              data-section-id={section.id}
            >
              <Component
                props={derivedProps}
                global={global}
                invitationId={invitationId}
                guestName={guestName}
                isPreview={isPreview}
                siblingTypes={siblingTypes}
              />
            </div>
          </div>
        );
      })}
    </EnchantedGardenStage>
  );
}
