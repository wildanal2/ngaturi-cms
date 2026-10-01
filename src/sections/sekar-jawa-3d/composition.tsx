import type { CSSProperties, MouseEvent } from "react";
import { getVariant } from "../registry";
import type { GlobalSettings, SectionData } from "../types";
import { sekarJawa3DContent, sekarJawa3DSectionProps } from "./content";
import styles from "./sekar-jawa-3d.module.css";
import { SEKAR_JAWA_3D_JOURNEY } from "./journey";
import { SekarJawa3DStage } from "./stage";
import { CeremonialReveals } from "./ceremonial-reveals";

export function SekarJawa3DComposition({
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
  const { journey, events, eventDate } = sekarJawa3DContent(sections);
  const simple = global.presentationMode === "simple";
  const renderStop = (
    section: SectionData,
    stop: (typeof SEKAR_JAWA_3D_JOURNEY)[number],
    immersive: boolean,
  ) => {
    const variant = getVariant(section.type, section.variant);
    if (!variant) return null;
    const Component = variant.component;
    const derivedProps = sekarJawa3DSectionProps(
      section,
      events,
      eventDate,
    );
    const rangeStyle = immersive
      ? ({
          "--journey-span": (stop.range[1] - stop.range[0]) * 15,
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
    SEKAR_JAWA_3D_JOURNEY.map((stop) => {
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
        data-sekar-jawa-3d-simple
        data-presentation-mode="simple"
        data-in-canvas={inCanvas || undefined}
        onClickCapture={selectSection}
      >
        <CeremonialReveals
          inCanvas={inCanvas}
          waitForOpen={!inCanvas && Boolean(journey.cover)}
        >
          {content(false)}
        </CeremonialReveals>
      </section>
    );
  }

  return (
    <div
      className={styles.composition}
      data-presentation-mode="cinematic"
      onClickCapture={selectSection}
    >
      <SekarJawa3DStage
        inCanvas={inCanvas}
        waitForOpen={!inCanvas && Boolean(journey.cover)}
      >
        <CeremonialReveals
          inCanvas={inCanvas}
          waitForOpen={!inCanvas && Boolean(journey.cover)}
        >
          {content(true)}
        </CeremonialReveals>
      </SekarJawa3DStage>
    </div>
  );
}
