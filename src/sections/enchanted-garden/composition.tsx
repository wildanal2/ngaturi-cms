import type { CSSProperties, MouseEvent } from "react";
import { getVariant } from "../registry";
import type { GlobalSettings, SectionData } from "../types";
import { enchantedGardenContent, enchantedGardenSectionProps } from "./content";
import styles from "./enchanted-garden.module.css";
import { ENCHANTED_GARDEN_JOURNEY } from "./journey";
import { EnchantedGardenStage } from "./stage";

export function EnchantedGardenComposition({
  sections,
  global,
  invitationId,
  guestName,
  isPreview,
  inCanvas = false,
  siblingTypes,
  selectedId,
  onSelect,
}: {
  sections: SectionData[];
  global: GlobalSettings;
  invitationId?: string;
  guestName?: string | null;
  isPreview?: boolean;
  inCanvas?: boolean;
  siblingTypes?: string[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { journey, events, eventDate } = enchantedGardenContent(sections);
  const simple = global.presentationMode === "simple";
  const renderStop = (
    section: SectionData,
    stop: (typeof ENCHANTED_GARDEN_JOURNEY)[number],
    immersive: boolean,
  ) => {
    const variant = getVariant(section.type, section.variant);
    if (!variant) return null;
    const Component = variant.component;
    const derivedProps = enchantedGardenSectionProps(
      section,
      events,
      eventDate,
    );
    const rangeStyle = immersive
      ? ({
          "--journey-start": `${stop.range[0] * 100}%`,
          "--journey-span": `${(stop.range[1] - stop.range[0]) * 100}%`,
        } as CSSProperties)
      : undefined;

    return (
      <div
        key={section.id}
        className={immersive ? styles.contentStop : styles.simpleSection}
        style={rangeStyle}
        data-journey-stop={stop.id}
        data-journey-progress={(stop.range[0] + stop.range[1]) / 2}
        data-selected={selectedId === section.id || undefined}
      >
        <div
          className={
            immersive
              ? section.type === "cover"
                ? styles.coverContent
                : styles.contentCard
              : styles.simpleContent
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
            inCanvas={inCanvas}
            siblingTypes={siblingTypes}
          />
        </div>
      </div>
    );
  };
  const content = (immersive: boolean) =>
    ENCHANTED_GARDEN_JOURNEY.map((stop) => {
      if (!("section" in stop) || !(stop.section in journey)) return null;
      const section = journey[stop.section as keyof typeof journey];
      return section ? renderStop(section, stop, immersive) : null;
    });
  const selectSection = onSelect
    ? (event: MouseEvent<HTMLElement>) => {
        const section = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-section-id]",
        );
        if (section?.dataset.sectionId) onSelect(section.dataset.sectionId);
      }
    : undefined;

  if (simple) {
    return (
      <section
        className={styles.simpleStage}
        data-enchanted-garden-simple
        data-presentation-mode="simple"
        data-in-canvas={inCanvas || undefined}
        onClickCapture={selectSection}
      >
        {content(false)}
      </section>
    );
  }

  return (
    <div
      className={styles.composition}
      data-presentation-mode="cinematic"
      onClickCapture={selectSection}
    >
      <EnchantedGardenStage
        inCanvas={inCanvas}
        waitForOpen={!inCanvas && Boolean(journey.cover)}
      >
        {content(true)}
      </EnchantedGardenStage>
    </div>
  );
}
