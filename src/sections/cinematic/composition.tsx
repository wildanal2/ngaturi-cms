import { getVariant } from "../registry";
import type { SectionData, SectionRenderProps } from "../types";
import { cinematicContent } from "./content";
import { CinematicStage } from "./stage";
import styles from "./cinematic.module.css";

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
  const render = (section?: SectionData) => {
    if (!section) return null;
    const Component = getVariant(section.type, section.variant)?.component;
    return Component ? (
      <Component {...renderProps} props={section.props} />
    ) : null;
  };
  const scene = (key: string, section?: SectionData) =>
    section ? (
      <section
        key={key}
        className={styles.scene}
        data-scene={key}
        data-section={section.type}
        data-section-id={section.id}
      >
        {render(section)}
      </section>
    ) : null;
  // Text/photo edits reuse the timeline and keep the current camera position.
  // Only changes to scene/rail topology require rebuilding the controller.
  const layoutKey = Object.values(core)
    .filter(Boolean)
    .map(
      (s) =>
        `${s!.id}:${Array.isArray(s!.props.images) ? s!.props.images.length : 0}:${Array.isArray(s!.props.events) ? s!.props.events.length : 0}`,
    )
    .join("|");
  return (
    <CinematicStage
      inCanvas={renderProps.inCanvas}
      layoutKey={layoutKey}
      presentationMode={renderProps.global.presentationMode ?? "cinematic"}
      selectedId={selectedId}
      onSelect={onSelect}
    >
      {scene("entrance", core.hero)}
      {scene("couple", core["couple-intro"])}
      {scene("quote", core.quote)}
      {core.gallery || core["event-details"] ? (
        <section className={styles.scene} data-scene="world">
          <div className={styles.worldCamera} data-world-camera>
            <div className={styles.worldRail} data-world-rail>
              {core.gallery ? (
                <div
                  className="contents"
                  data-section="gallery"
                  data-section-id={core.gallery.id}
                >
                  {render(core.gallery)}
                </div>
              ) : null}
              {core["event-details"] ? (
                <div
                  className="contents"
                  data-section="event-details"
                  data-section-id={core["event-details"].id}
                >
                  {render(core["event-details"])}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {scene("venue", core["map-location"])}
      {scene("closing", core.closing)}
    </CinematicStage>
  );
}
