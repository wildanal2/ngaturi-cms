import type { SectionRenderProps } from "../types";
import { formatEventDate } from "../shared";
import { HeritageFrame, Portrait, SceneBody } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Portrait di dalam gerbang yang didekati kamera saat scroll. */
export function HeroCinematicVintage({ props }: SectionRenderProps) {
  const p = props as {
    couple_names?: string;
    tagline?: string;
    event_date?: string;
    background_image?: string;
  };
  return (
    <SceneBody>
      <HeritageFrame className={styles.entranceFrame}>
        <Portrait src={p.background_image} />
        <div className={styles.photoCaption}>
          <p className={styles.eyebrow}>{p.tagline ?? "The Wedding Of"}</p>
          <h1>{p.couple_names ?? "Nama Mempelai"}</h1>
          <p>{formatEventDate(p.event_date)}</p>
        </div>
      </HeritageFrame>
      <p className={styles.scrollHint}>Gulir perlahan · kisah kita dimulai</p>
    </SceneBody>
  );
}
