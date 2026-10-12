"use client";

import { useRef } from "react";
import type { SectionRenderProps } from "../types";
import {
  GerbangPuspaMonogram,
  GerbangPuspaNames,
} from "../gerbang-puspa/primitives";
import {
  useGerbangPuspa,
  useGerbangPuspaCoverOpening,
} from "../gerbang-puspa/opening";
import foundation from "../gerbang-puspa/foundation.module.css";
import { useOpen } from "./shell";
import styles from "./cover-gerbang-puspa.module.css";

/** A retained cover in the native section flow, rather than a page overlay. */
export function CoverGerbangPuspa({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const { open, reveal } = useOpen();
  const { reducedMotion } = useGerbangPuspa();
  const coverRef = useRef<HTMLElement>(null);
  const { activate } = useGerbangPuspaCoverOpening({
    open,
    reveal,
    coverRef,
    inCanvas,
  });
  const names = typeof props.names === "string" ? props.names : "Nama Mempelai";
  const text = (key: string, fallback: string) =>
    typeof props[key] === "string" ? props[key] : fallback;

  function openInvitation() {
    if (open) return;
    activate();
    if (!reducedMotion) {
      coverRef.current?.animate(
        [{ opacity: 1 }, { opacity: 0.9 }, { opacity: 1 }],
        { duration: 500, easing: "linear" },
      );
    }
  }

  return (
    <section
      ref={coverRef}
      className={`${foundation.scope} ${styles.cover}`}
      data-invitation-cover
      data-gerbang-puspa-cover
      data-open={open ? "1" : "0"}
      aria-label="Undangan pernikahan"
    >
      <div className={styles.frame}>
        <div className={styles.composition}>
          <GerbangPuspaMonogram names={names} className={styles.monogram} />
          <p className={styles.eyebrow}>{text("tagline", "The Wedding Of")}</p>
          <GerbangPuspaNames names={names} />
          <div className={styles.recipient}>
            <p>{text("note", "Kepada Bapak/Ibu/Saudara/i")}</p>
            <strong>{guestName || "Tamu Undangan"}</strong>
          </div>
          {!open && (
            <button
              type="button"
              className={styles.button}
              onClick={openInvitation}
            >
              {text("button_label", "Buka Undangan")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
