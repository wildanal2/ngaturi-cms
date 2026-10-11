"use client";

import type { SectionRenderProps } from "../types";
import { textProp } from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import styles from "../serambi-delima/phase-three.module.css";

/** Arabic and translation stay in the existing multiline text contract. */
export function QuoteSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const paragraphs = textProp(props.text)
    .split(/\r?\n+/)
    .filter((line) => line.trim());
  const source = textProp(props.source);
  return (
    <SerambiSection type="quote" title="Kutipan & Doa" inCanvas={inCanvas}>
      <SerambiEntrance inCanvas={inCanvas}>
        <blockquote className={styles.quote}>
          {paragraphs.map((paragraph, index) => {
            const firstLetter = paragraph.match(/\p{Letter}/u)?.[0];
            const arabic =
              !!firstLetter && /\p{Script=Arabic}/u.test(firstLetter);
            return (
              <p
                key={index}
                className={arabic ? styles.arabic : styles.quoteBody}
                dir={arabic ? "rtl" : "auto"}
                lang={arabic ? "ar" : undefined}
              >
                {paragraph}
              </p>
            );
          })}
          {source ? (
            <footer className={styles.attribution}>
              <cite dir="auto">{source}</cite>
            </footer>
          ) : null}
        </blockquote>
      </SerambiEntrance>
    </SerambiSection>
  );
}
