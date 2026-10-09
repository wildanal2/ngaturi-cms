import type { SectionRenderProps } from "../types";
import { HeritageFrame, SceneBody } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Kutipan dalam bingkai dengan ruang tenang untuk camera pull-back. */
export function QuoteCinematicVintage({ props }: SectionRenderProps) {
  const p = props as { text?: string; source?: string };
  if (!p.text?.trim()) return null;
  return (
    <SceneBody>
      <HeritageFrame className={styles.quoteFrame}>
        <p className={styles.eyebrow}>Sepenggal doa</p>
        <blockquote className={styles.quote}>{p.text ?? ""}</blockquote>
        {p.source?.trim() ? (
          <p className={styles.quoteSource}>{p.source}</p>
        ) : null}
      </HeritageFrame>
    </SceneBody>
  );
}
