"use client";

import type { SectionRenderProps } from "../types";
import {
  Divider,
  BotanicalAccent,
  Portal,
  PortraitMedia,
  textProp,
} from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import foundation from "../serambi-delima/serambi-delima.module.css";
import styles from "../serambi-delima/phase-four.module.css";

export function ClosingSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const names = textProp(props.names);
  const message = textProp(props.message);
  return (
    <SerambiSection type="closing" title="Terima Kasih" inCanvas={inCanvas}>
      <SerambiEntrance inCanvas={inCanvas} zoom>
        <div
          className={`${foundation.portraitFrame} ${foundation.editorialPortrait} ${styles.closingPortrait}`}
          data-has-photo={!!textProp(props.photo)}
        >
          <Portal>
            <div className={foundation.portraitMask}>
              <PortraitMedia
                eager={false}
                src={textProp(props.photo)}
                alt={names ? `Foto ${names}` : "Foto pasangan"}
              />
            </div>
          </Portal>
          <BotanicalAccent placement="corners" />
        </div>
      </SerambiEntrance>
      <SerambiEntrance inCanvas={inCanvas} className={styles.closingCopy}>
        {message ? (
          <p className={styles.closingMessage} dir="auto">
            {message}
          </p>
        ) : null}
        {names ? (
          <div className={styles.signature}>
            <p className={styles.closingEyebrow}>Kami yang berbahagia</p>
            <h3 className={styles.closingNames} dir="auto">
              {names}
            </h3>
          </div>
        ) : null}
        <Divider />
      </SerambiEntrance>
    </SerambiSection>
  );
}
