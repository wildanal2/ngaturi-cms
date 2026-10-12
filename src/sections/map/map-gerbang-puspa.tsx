"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SectionRenderProps } from "../types";
import { useGerbangPuspa } from "../gerbang-puspa/opening";
import {
  externalLink,
  matchingText,
  textValue,
} from "../gerbang-puspa/phase-two-data";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./map-gerbang-puspa.module.css";

/** Locate only the immediately preceding rendered section, including native Builder wrappers. */
function previousSection(element: HTMLElement) {
  let boundary = element.closest<HTMLElement>(
    "[data-section], [data-section-id]",
  );
  while (
    boundary &&
    !boundary.previousElementSibling &&
    !boundary.parentElement?.hasAttribute("data-gerbang-puspa")
  ) {
    if (
      boundary.parentElement?.querySelectorAll(
        "[data-section], [data-section-id]",
      ).length !== 1
    )
      break;
    boundary = boundary.parentElement;
  }
  return boundary?.previousElementSibling;
}

export function MapGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const { reducedMotion } = useGerbangPuspa();
  const venue = textValue(props.venue_name),
    address = textValue(props.address);
  const maps = externalLink(textValue(props.maps_url)),
    embed = externalLink(textValue(props.embed_url));
  const ref = useRef<HTMLElement>(null);
  const [pair, setPair] = useState<{ top: number; width: number } | null>(null);
  const [failedEmbed, setFailedEmbed] = useState<string>();

  useEffect(() => {
    const location = ref.current;
    if (!location) return;
    let observed: HTMLElement | null = null;
    let observedFrame: HTMLElement | null = null;
    let sourceMotion: Animation | undefined;
    let ownMotion: Animation | undefined;
    let timingFrame = 0;
    const control = location.querySelector<HTMLElement>(
      `.${styles.locationCard}`,
    )!;
    const resetMotion = () => {
      ownMotion?.cancel();
      ownMotion = undefined;
      sourceMotion = undefined;
      control.style.opacity = "";
      control.style.transformOrigin = "";
    };
    const observer = new ResizeObserver(() => measure());
    const measure = () => {
      const previous = previousSection(location);
      const events = previous?.querySelector<HTMLElement>(
        "[data-gerbang-puspa-events]",
      );
      const card = events?.querySelector<HTMLElement>("[data-gp-event-card]");
      // An embed, unrelated address or multi-place sequence remains independent.
      const related =
        events?.dataset.gpEventGroups === "1" &&
        card &&
        maps &&
        !embed &&
        (!venue ||
          matchingText(venue) ===
            matchingText(card.dataset.gpEventVenue ?? "")) &&
        (!address ||
          matchingText(address) ===
            matchingText(card.dataset.gpEventAddress ?? "")) &&
        (!card.dataset.gpEventMaps || card.dataset.gpEventMaps === maps);
      if (observed !== events) {
        if (observed) observer.unobserve(observed);
        observed = events ?? null;
        if (observed) observer.observe(observed);
      }
      const nextFrame = card?.parentElement ?? null;
      if (observedFrame !== nextFrame) {
        if (observedFrame) observer.unobserve(observedFrame);
        observedFrame = nextFrame;
        if (observedFrame) observer.observe(observedFrame);
      }
      if (!related || !card || !events) {
        resetMotion();
        setPair(null);
        return;
      }
      const frame = card.parentElement!;
      const own = location.getBoundingClientRect();
      // Layout dimensions stay stable while the reference's zoom reveal runs.
      const top =
        events.getBoundingClientRect().top +
        frame.offsetTop +
        frame.offsetHeight -
        own.top -
        62;
      const width = card.clientWidth;
      // Location owns its CTA; match the adjacent native reveal's actual timeline.
      const animation = frame.getAnimations()[0];
      control.style.transformOrigin = `center ${62 - frame.offsetHeight / 2}px`;
      if (animation && animation !== sourceMotion) {
        ownMotion?.cancel();
        sourceMotion = animation;
        control.style.opacity = "";
        const timing = animation.effect!.getTiming();
        ownMotion = control.animate(
          [
            { opacity: 0, transform: "translateX(-50%) scale(.3)" },
            { opacity: 1, offset: 0.5 },
            { opacity: 1, transform: "translateX(-50%) scale(1)" },
          ],
          {
            duration: Number(timing.duration),
            delay: timing.delay,
            easing: timing.easing,
            fill: "both",
          },
        );
        cancelAnimationFrame(timingFrame);
        timingFrame = requestAnimationFrame(() => {
          if (
            ownMotion &&
            sourceMotion === animation &&
            animation.startTime !== null
          )
            ownMotion.startTime = animation.startTime;
        });
      } else if (!animation) {
        resetMotion();
        control.style.opacity = getComputedStyle(frame).opacity;
      }
      setPair((old) =>
        old &&
        Math.abs(old.top - top) < 0.1 &&
        Math.abs(old.width - width) < 0.1
          ? old
          : { top, width },
      );
    };
    measure();
    observer.observe(location);
    const mutations = new MutationObserver(measure);
    mutations.observe(
      location.closest("[data-gerbang-puspa]") ?? location.parentElement!,
      {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          "data-gp-event-groups",
          "data-gp-event-venue",
          "data-gp-event-address",
          "data-gp-event-maps",
          "class",
        ],
      },
    );
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(timingFrame);
      resetMotion();
    };
  }, [venue, address, maps, embed, inCanvas, reducedMotion]);

  return (
    <section
      ref={ref}
      className={`${foundation.scene} ${styles.location} ${pair ? styles.joined : ""}`}
      data-scene="location"
      data-gerbang-puspa-location
      data-gp-location-joined={!!pair}
      style={
        pair
          ? ({
              "--gp-map-top": `${pair.top}px`,
              "--gp-map-width": `${pair.width}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className={styles.locationCard}>
        <div className={pair ? styles.srOnly : styles.addressBlock}>
          {!pair && <h2>Lokasi</h2>}
          {venue && <strong>{venue}</strong>}
          {address && <p>{address}</p>}
        </div>
        {!pair && embed && failedEmbed !== embed && (
          <iframe
            src={embed}
            title={venue ? `Peta ${venue}` : "Peta lokasi"}
            loading="lazy"
            className={styles.map}
            onError={() => setFailedEmbed(embed)}
          />
        )}
        {!pair && !maps && (!embed || failedEmbed === embed) && (
          <p className={styles.fallback}>Lokasi belum tersedia.</p>
        )}
        {maps && (
          <a
            className={styles.mapButton}
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Maps
          </a>
        )}
      </div>
    </section>
  );
}
