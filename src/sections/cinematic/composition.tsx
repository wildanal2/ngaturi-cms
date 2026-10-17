import type { ReactNode } from "react";
import { getVariant } from "../registry";
import { cinematicStoryItems } from "../story/cinematic-items";
import type { SectionData, SectionRenderProps } from "../types";
import { cinematicContent, cinematicVariant } from "./content";
import { InteractionSequence } from "./interaction-sequence";
import { CinematicStage } from "./stage";
import { CinematicViewport } from "./viewport-owner";
import styles from "./cinematic.module.css";

const SCENES: Record<string, string> = {
  hero: "entrance",
  "couple-intro": "couple",
  quote: "quote",
  story: "story",
  countdown: "countdown",
  "map-location": "venue",
  closing: "closing",
};
const INTERACTIONS = new Set(["rsvp", "gift", "guestbook"]);
const WORLD = new Set(["gallery", "event-details"]);

/** Orchestrate existing records in authored order; defaults belong to the preset. */
export function CinematicComposition({
  sections,
  compositionActive,
  selectedId,
  onSelect,
  ...renderProps
}: Omit<SectionRenderProps, "props"> & {
  sections: SectionData[];
  compositionActive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { core } = cinematicContent(sections, compositionActive);
  const ordered = Object.values(core)
    .filter((s): s is SectionData => !!s)
    .sort((a, b) => a.order - b.order);
  const render = (section: SectionData) => {
    const Component = getVariant(
      section.type,
      cinematicVariant(section),
    )?.component;
    return Component ? (
      <Component {...renderProps} props={section.props} />
    ) : null;
  };
  const stages: ReactNode[] = [];
  let cursor = 0;
  while (cursor < ordered.length) {
    const first = ordered[cursor];
    const interaction = INTERACTIONS.has(first.type);
    const group: SectionData[] = [];
    let hasWorld = false;
    while (
      cursor < ordered.length &&
      INTERACTIONS.has(ordered[cursor].type) === interaction
    ) {
      const section = ordered[cursor];
      // Closing and each separate rail get their own camera. This also handles
      // optional/reordered chapters without generating an extra fallback section.
      if (
        group.length &&
        (section.type === "closing" || group[0].type === "closing")
      )
        break;
      if (!interaction && WORLD.has(section.type)) {
        if (hasWorld) break;
        hasWorld = true;
        group.push(section);
        cursor++;
        if (
          section.type === "gallery" &&
          ordered[cursor]?.type === "event-details"
        )
          group.push(ordered[cursor++]);
      } else {
        group.push(section);
        cursor++;
      }
      if (section.type === "closing") break;
    }
    if (interaction) {
      stages.push(
        <InteractionSequence
          key={first.id}
          selectedId={selectedId}
          onSelect={onSelect}
          inCanvas={renderProps.inCanvas}
          presentationMode={renderProps.global.presentationMode ?? "cinematic"}
        >
          {group.map((section) => (
            <section
              key={section.id}
              className={styles.interactionScene}
              data-cinematic-interaction
              data-section={section.type}
              data-section-id={section.id}
            >
              {render(section)}
            </section>
          ))}
        </InteractionSequence>,
      );
      continue;
    }
    const scenes: ReactNode[] = [];
    for (let i = 0; i < group.length; i++) {
      const section = group[i];
      if (WORLD.has(section.type)) {
        const rail = [section];
        if (
          section.type === "gallery" &&
          group[i + 1]?.type === "event-details"
        )
          rail.push(group[++i]);
        scenes.push(
          <section key={section.id} className={styles.scene} data-scene="world">
            <div className={styles.worldCamera} data-world-camera>
              <div className={styles.worldRail} data-world-rail>
                {rail.map((s) => (
                  <div
                    key={s.id}
                    className="contents"
                    data-section={s.type}
                    data-section-id={s.id}
                  >
                    {render(s)}
                  </div>
                ))}
              </div>
            </div>
          </section>,
        );
      } else
        scenes.push(
          <section
            key={section.id}
            className={styles.scene}
            data-scene={SCENES[section.type]}
            data-section={section.type}
            data-section-id={section.id}
          >
            {render(section)}
          </section>,
        );
    }
    const layoutKey = group
      .map(
        (s) =>
          `${s.id}:${Array.isArray(s.props.images) ? s.props.images.filter((image) => image?.url?.trim()).length : 0}:${s.type === "story" ? cinematicStoryItems(s.props.items).length : 0}:${Array.isArray(s.props.events) ? s.props.events.length : 0}`,
      )
      .join("|");
    stages.push(
      <CinematicStage
        key={first.id}
        inCanvas={renderProps.inCanvas}
        layoutKey={layoutKey}
        presentationMode={renderProps.global.presentationMode ?? "cinematic"}
        selectedId={selectedId}
        onSelect={onSelect}
      >
        {scenes}
      </CinematicStage>,
    );
  }
  // Native scrolling is guest-controlled. Pausing never starts an automatic tour.
  return (
    <>
      <CinematicViewport inCanvas={renderProps.inCanvas} />
      {stages}
    </>
  );
}
