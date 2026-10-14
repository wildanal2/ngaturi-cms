import { getVariant } from "../registry";
import { cinematicStoryItems } from "../story/cinematic-items";
import type { SectionData, SectionRenderProps } from "../types";
import { cinematicContent, cinematicVariant } from "./content";
import { InteractionSequence } from "./interaction-sequence";
import { CinematicStage } from "./stage";
import { CinematicAutoScroll } from "./auto-scroll-player";
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
  const hasVisualChapters = [
    core.hero,
    core["couple-intro"],
    core.quote,
    core.story,
    core.countdown,
    core.gallery,
    core["event-details"],
    core["map-location"],
  ].some(Boolean);
  const render = (section?: SectionData) => {
    if (!section) return null;
    const Component = getVariant(
      section.type,
      cinematicVariant(section),
    )?.component;
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
        `${s!.id}:${Array.isArray(s!.props.images) ? s!.props.images.filter((image) => image?.url?.trim()).length : 0}:${s!.type === "story" ? cinematicStoryItems(s!.props.items).length : 0}:${Array.isArray(s!.props.events) ? s!.props.events.length : 0}`,
    )
    .join("|");
  return (
    <>
      {hasVisualChapters ? (
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
          {scene("story", core.story)}
          {scene("countdown", core.countdown)}
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
        </CinematicStage>
      ) : null}
      {core.rsvp || core.gift || core.guestbook ? (
        <InteractionSequence
          selectedId={selectedId}
          onSelect={onSelect}
          inCanvas={renderProps.inCanvas}
          presentationMode={renderProps.global.presentationMode ?? "cinematic"}
        >
          {[core.rsvp, core.gift, core.guestbook].map((section) =>
            section ? (
              <section
                key={section.id}
                className={styles.interactionScene}
                data-cinematic-interaction
                data-section={section.type}
                data-section-id={section.id}
              >
                {render(section)}
              </section>
            ) : null,
          )}
        </InteractionSequence>
      ) : null}
      {core.closing ? (
        <CinematicStage
          inCanvas={renderProps.inCanvas}
          layoutKey={core.closing.id}
          presentationMode={renderProps.global.presentationMode ?? "cinematic"}
          selectedId={selectedId}
          onSelect={onSelect}
        >
          {scene("closing", core.closing)}
        </CinematicStage>
      ) : null}
      <CinematicAutoScroll
        enabled={
          !renderProps.inCanvas &&
          renderProps.global.presentationMode !== "simple"
        }
      />
    </>
  );
}
