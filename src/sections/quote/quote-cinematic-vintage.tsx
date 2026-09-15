import type { SectionRenderProps } from "../types";
import { HeritageFrame, SceneBody } from "../cinematic/primitives";
import styles from "../cinematic/cinematic.module.css";

/** Kutipan dalam bingkai dengan ruang tenang untuk camera pull-back. */
export function QuoteCinematicVintage({ props }: SectionRenderProps) {
  const p = props as { text?: string; source?: string };
  return (
    <SceneBody>
      <HeritageFrame className={styles.quoteFrame}>
        <p className={styles.eyebrow}>Dalam kasih-Nya</p>
        <blockquote className={styles.quote}>{p.text ?? ""}</blockquote>
        <p className="mt-5 text-xs tracking-widest">{p.source}</p>
      </HeritageFrame>
    </SceneBody>
  );
}
