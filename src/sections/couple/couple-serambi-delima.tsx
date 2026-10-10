"use client";

import { AtSign } from "lucide-react";
import type { SectionRenderProps } from "../types";
import type { Person } from "./person";
import {
  Divider,
  BotanicalAccent,
  Portal,
  PortraitMedia,
  textProp,
} from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiLink,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import foundation from "../serambi-delima/serambi-delima.module.css";
import styles from "../serambi-delima/sections.module.css";

function Partner({
  person,
  label,
  inCanvas,
  side,
}: {
  person: Person;
  label: string;
  inCanvas?: boolean;
  side: "groom" | "bride";
}) {
  const name = textProp(person.full_name) || textProp(person.name);
  const instagram = textProp(person.instagram).replace(/^@/, "");
  return (
    <SerambiEntrance inCanvas={inCanvas} zoom>
      <article className={styles.partner} data-partner={side}>
        <div
          className={`${foundation.portraitFrame} ${foundation.editorialPortrait} ${styles.partnerPortrait}`}
        >
          <Portal>
            <div className={foundation.portraitMask}>
              <PortraitMedia
                src={textProp(person.photo)}
                alt={name}
                eager={false}
              />
            </div>
          </Portal>
          <BotanicalAccent />
        </div>
        <div className={styles.partnerCopy}>
          <p className={styles.eyebrow}>{label}</p>
          {name ? <h3 className={styles.partnerName}>{name}</h3> : null}
          <div className={styles.profile}>
            {person.child_order ? (
              <p className={styles.copy}>{person.child_order}</p>
            ) : null}
            {person.parents ? (
              <p className={`${styles.copy} ${styles.parents}`}>
                {person.parents}
              </p>
            ) : null}
            {person.bio ? <p className={styles.copy}>{person.bio}</p> : null}
            {person.residence ? (
              <p className={styles.copy}>{person.residence}</p>
            ) : null}
          </div>
          {instagram ? (
            <div className={styles.actions}>
              <SerambiLink
                href={`https://instagram.com/${encodeURIComponent(instagram)}`}
                secondary
              >
                <AtSign size={18} aria-hidden="true" /> {instagram}
              </SerambiLink>
            </div>
          ) : null}
        </div>
        <div className={styles.partnerDivider}>
          <Divider />
        </div>
      </article>
    </SerambiEntrance>
  );
}

export function CoupleSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const p = props as {
    groom?: Person;
    bride?: Person;
    title?: string;
    eyebrow?: string;
  };
  return (
    <SerambiSection
      type="couple-intro"
      title={textProp(p.title, "Mempelai")}
      eyebrow={textProp(p.eyebrow)}
      inCanvas={inCanvas}
    >
      <div className={styles.stack}>
        <Partner
          person={p.groom ?? {}}
          label="Mempelai Pria"
          inCanvas={inCanvas}
          side="groom"
        />
        <Partner
          person={p.bride ?? {}}
          label="Mempelai Wanita"
          inCanvas={inCanvas}
          side="bride"
        />
      </div>
    </SerambiSection>
  );
}
