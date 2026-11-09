"use client";

import { Fragment } from "react";
import type { SectionRenderProps } from "../types";
import { GerbangPuspaFlowers } from "../gerbang-puspa/primitives";
import { GerbangPuspaPhaseTwoReveal as Reveal } from "../gerbang-puspa/phase-two-media";
import { splitGerbangPuspaNames } from "../gerbang-puspa/content";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./closing-gerbang-puspa.module.css";

export function ClosingGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const paragraphs = String(props.message ?? "")
    .split(/\n\s*\n/)
    .filter(Boolean);
  const names = splitGerbangPuspaNames(String(props.names ?? ""));
  return (
    <section
      className={`${foundation.scene} ${styles.closing}`}
      data-scene="closing"
      data-gerbang-puspa-closing
    >
      <div className={`${foundation.frame} ${styles.closingFrame}`}>
        {paragraphs.map((paragraph, index) => (
          <Reveal key={index} kind="down" inCanvas={inCanvas}>
            <p className={index === 1 ? styles.thanks : undefined}>
              {paragraph}
            </p>
          </Reveal>
        ))}
        <div className={styles.names}>
          {names.filter(Boolean).map((name, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <Reveal
                  kind="zoom"
                  inCanvas={inCanvas}
                  className={styles.ampersand}
                >
                  <span>&amp;</span>
                </Reveal>
              )}
              <Reveal kind={index === 0 ? "left" : "right"} inCanvas={inCanvas}>
                <span>{name}</span>
              </Reveal>
            </Fragment>
          ))}
        </div>
      </div>
      <GerbangPuspaFlowers className={styles.flowers} />
    </section>
  );
}
