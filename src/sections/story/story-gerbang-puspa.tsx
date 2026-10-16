"use client";

import type { z } from "zod";
import type { StoryProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { GP_PHASE_TWO_ASSETS as assets } from "../gerbang-puspa/phase-two-assets";
import {
  GerbangPuspaMedia,
  GerbangPuspaPhaseTwoReveal as Reveal,
} from "../gerbang-puspa/phase-two-media";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./story-gerbang-puspa.module.css";

export function StoryGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const p = props as z.infer<typeof StoryProps>;
  const items = p.items ?? [];
  if (!items.length && !inCanvas) return null;
  return (
    <section
      className={`${foundation.scene} ${styles.story}`}
      data-scene="story"
      data-gerbang-puspa-story
    >
      <div className={`${foundation.frame} ${styles.storyFrame}`}>
        {!items.length && <p>Tambahkan cerita dan foto Anda di editor.</p>}
        <Reveal kind="zoom" inCanvas={inCanvas}>
          <GerbangPuspaMedia
            src={items[0]?.image}
            fallback={assets.story}
            alt={p.title || "Ilustrasi kisah pasangan"}
            className={styles.storyPhoto}
          />
        </Reveal>
        <Reveal kind="down" inCanvas={inCanvas}>
          {p.eyebrow && <p className={styles.eyebrow}>{p.eyebrow}</p>}
          {p.title && <h2>{p.title}</h2>}
        </Reveal>
        {items.map((item, index) => (
          <Reveal key={index} inCanvas={inCanvas} className={styles.chapter}>
            {index > 0 && item.image && (
              <GerbangPuspaMedia
                src={item.image}
                fallback={assets.story}
                alt={item.title || `Momen ${index + 1}`}
                className={styles.chapterPhoto}
              />
            )}
            {item.year && <p className={styles.year}>{item.year}</p>}
            {item.title && <h3>{item.title}</h3>}
            {item.description && <p>{item.description}</p>}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
