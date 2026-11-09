"use client";

import type { z } from "zod";
import type { CoupleIntroProps } from "../schema";
import type { SectionRenderProps } from "../types";
import {
  GerbangPuspaMedia,
  GerbangPuspaPhaseTwoReveal as Reveal,
} from "../gerbang-puspa/phase-two-media";
import { GP_PHASE_TWO_ASSETS as assets } from "../gerbang-puspa/phase-two-assets";
import { instagramProfile } from "../gerbang-puspa/phase-two-data";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./couple-gerbang-puspa.module.css";

export function CoupleGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const p = props as z.infer<typeof CoupleIntroProps>;
  return (
    <section
      className={`${foundation.scene} ${styles.couple}`}
      data-scene="couple"
      data-gerbang-puspa-couple
    >
      <div className={`${foundation.frame} ${styles.coupleFrame}`}>
        {(p.title || p.eyebrow) && (
          <Reveal kind="down" inCanvas={inCanvas}>
            {p.eyebrow && <p className={styles.eyebrow}>{p.eyebrow}</p>}
            {p.title && <h2>{p.title}</h2>}
          </Reveal>
        )}
        {[p.bride, p.groom].map((person, index) => {
          const profile = instagramProfile(person?.instagram ?? "");
          const name = person?.full_name || person?.name || "";
          return (
            <div className={styles.person} key={index} data-gp-partner={index}>
              <Reveal kind="zoom" inCanvas={inCanvas}>
                <div className={styles.portrait}>
                  <GerbangPuspaMedia
                    src={person?.photo}
                    eager
                    fallback={index === 0 ? assets.bride : assets.groom}
                    alt={name ? `Potret ${name}` : "Ilustrasi mempelai"}
                  />
                </div>
              </Reveal>
              <Reveal delay={120} inCanvas={inCanvas}>
                {name && <h3>{name}</h3>}
                {(person?.child_order || person?.parents) && (
                  <p>
                    {person.child_order}
                    {person.child_order && person.parents && <br />}
                    {person.parents}
                  </p>
                )}
                {person?.bio && <p className={styles.extra}>{person.bio}</p>}
                {person?.residence && (
                  <p className={styles.extra}>{person.residence}</p>
                )}
                {profile && (
                  <a
                    className={styles.social}
                    href={profile.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.label}
                  </a>
                )}
              </Reveal>
              {index === 0 && <span className={styles.ampersand}>&amp;</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
