"use client";

import type { SectionRenderProps } from "../types";
import { GP_ASSETS } from "../gerbang-puspa/assets";
import { GerbangPuspaMedia } from "../gerbang-puspa/phase-two-media";
import { GerbangPuspaReveal } from "../gerbang-puspa/primitives";
import { useGerbangPuspa } from "../gerbang-puspa/opening";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./quote-gerbang-puspa.module.css";

/** Existing text/source fields carry both blocks without extending the schema. */
export function QuoteGerbangPuspa({ props }: SectionRenderProps) {
  const opening = useGerbangPuspa();
  const [quote = "", ...welcome] = String(props.text ?? "").split(/\n\s*\n/);
  const source = String(props.source ?? "");

  return (
    <section
      className={`${foundation.scene} ${styles.quote}`}
      data-scene="quote"
      data-gerbang-puspa-quote
    >
      <GerbangPuspaReveal className={styles.quoteCard}>
        <p>{quote}</p>
        {source && <strong>{source}</strong>}
      </GerbangPuspaReveal>
      <GerbangPuspaReveal delay={120} className={styles.welcomeCard}>
        <GerbangPuspaMedia
          src={opening?.heroMediaUrl}
          fallback={GP_ASSETS.welcome}
          alt=""
        />
        <div className={styles.welcomeText}>
          {welcome[0] && <strong>{welcome[0]}</strong>}
          {welcome.slice(1).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </GerbangPuspaReveal>
    </section>
  );
}
