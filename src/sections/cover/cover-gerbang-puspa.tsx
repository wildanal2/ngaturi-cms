"use client";

import { useRef } from "react";
import type { SectionRenderProps } from "../types";
import {
  GerbangPuspaMonogram,
  GerbangPuspaNames,
  GerbangPuspaOrnaments,
} from "../gerbang-puspa/primitives";
import {
  useGerbangPuspa,
  useGerbangPuspaCoverOpening,
} from "../gerbang-puspa/opening";
import foundation from "../gerbang-puspa/foundation.module.css";
import { useOpen } from "./shell";
import styles from "./cover-gerbang-puspa.module.css";

/** Public entry is a viewport overlay; Builder keeps the cover in editable flow. */
export function CoverGerbangPuspa({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const { open, reveal } = useOpen();
  const presentation = useGerbangPuspa();
  const stage =
    presentation.managed && !inCanvas
      ? presentation.stage
      : open
        ? "opened"
        : "closed";
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
  }

  return (
    <section
      ref={coverRef}
      className={`${foundation.scope} ${styles.cover}`}
      data-invitation-cover
      data-gerbang-puspa-cover
      data-open={open ? "1" : "0"}
      data-stage={stage}
      data-in-canvas={!!inCanvas}
      hidden={!inCanvas && stage === "opened"}
      inert={!inCanvas && stage !== "closed"}
      aria-hidden={(!inCanvas && stage !== "closed") || undefined}
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
          {(!open || !inCanvas) && (
            <button
              type="button"
              className={styles.button}
              onClick={openInvitation}
              disabled={inCanvas || stage !== "closed"}
              aria-busy={stage === "opening"}
            >
              {text("button_label", "Buka Undangan")}
            </button>
          )}
        </div>
      </div>
      <GerbangPuspaOrnaments />
    </section>
  );
}
