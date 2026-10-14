"use client";

import Image from "next/image";
import { useState } from "react";
import type { z } from "zod";
import type { StoryProps } from "../schema";
import type { SectionRenderProps } from "../types";
import { HeritageFrame, SceneBody } from "../cinematic/primitives";
import {
  cinematicStoryItems,
  type CinematicStoryItem,
} from "./cinematic-items";
import styles from "../cinematic/cinematic.module.css";

function Memory({ item }: { item: CinematicStoryItem }) {
  const [failedSource, setFailedSource] = useState<string>();
  return (
    <article data-story-memory className={styles.storyMemory}>
      <HeritageFrame className={styles.storyFrame}>
        {item.image?.trim() && failedSource !== item.image ? (
          <div className={styles.storyPhoto}>
            <Image
              src={item.image}
              alt={item.title?.trim() || "Kenangan perjalanan kami"}
              fill
              sizes="(max-width: 512px) 70vw, 340px"
              className={styles.storyImage}
              onError={() => setFailedSource(item.image)}
            />
          </div>
        ) : null}
        <div className={styles.storyNarrative}>
          {item.year?.trim() ? (
            <p className={styles.storyYear}>{item.year}</p>
          ) : null}
          {item.title?.trim() ? <h3>{item.title}</h3> : null}
          {item.description?.trim() ? (
            <p className={styles.storyDescription}>{item.description}</p>
          ) : null}
        </div>
      </HeritageFrame>
    </article>
  );
}

export function StoryCinematicVintage({ props }: SectionRenderProps) {
  const p = props as Partial<z.infer<typeof StoryProps>>;
  const items = cinematicStoryItems(p.items);
  if (!items.length) return null;
  return (
    <SceneBody className={styles.storyScene}>
      <header className={styles.storyHeading} data-story-heading>
        {p.eyebrow?.trim() ? (
          <p className={styles.eyebrow}>{p.eyebrow}</p>
        ) : null}
        <h2>{p.title?.trim() || "Perjalanan Kami"}</h2>
      </header>
      <div className={styles.storyMemories}>
        {items.map((item, index) => (
          <Memory key={index} item={item} />
        ))}
      </div>
    </SceneBody>
  );
}
