"use client";

import { useEffect, useRef, useState } from "react";
import type { SectionRenderProps } from "../types";
import { CoverShell, useOpen, type CoverProps } from "./shell";
import { Backdrop, HeritageFrame } from "../cinematic/primitives";
import { useLoadingPhase } from "../loading/context";
import { containCinematicCover } from "../cinematic/cover-focus";
import styles from "../cinematic/cinematic.module.css";

/** Gerbang heritage; lifecycle buka undangan tetap milik cover existing. */
export function CoverCinematicVintage({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const p = props as CoverProps;
  const loading = useLoadingPhase() !== "complete";
  const { open, reveal } = useOpen();
  const [leaving, setLeaving] = useState(false);
  const [gateOffset, setGateOffset] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gate = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inCanvas || loading || !gate.current) return;
    if (!open || leaving) return containCinematicCover(gate.current);
    gate.current.closest(".cinematic-invitation")
      ?.querySelector<HTMLElement>("[data-cinematic-opening-focus]")
      ?.focus({ preventScroll: true });
  }, [inCanvas, loading, open, leaving]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const finish = () => {
    setLeaving(false);
    if (timer.current) clearTimeout(timer.current);
  };
  const enter = () => {
    if (inCanvas || loading || open) return;
    setGateOffset(
      gate.current?.closest("[data-invitation-cover]")
        ?.getBoundingClientRect().top ?? 0,
    );
    const invitation = gate.current?.closest(".cinematic-invitation");
    if (invitation)
      window.scrollTo({
        top: invitation.getBoundingClientRect().top + window.scrollY,
        behavior: "instant",
      });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setLeaving(!reduced);
    reveal(); // Keep playback inside the original user gesture.
    if (!reduced) timer.current = setTimeout(finish, 480);
    else finish();
  };
  return (
    <CoverShell
      inCanvas={inCanvas}
      open={open && !leaving}
      bg="var(--inv-primary)"
      style={
        leaving
          ? { backgroundColor: "transparent", translate: `0 ${gateOffset}px` }
          : undefined
      }
    >
      <div
        ref={gate}
        role={!inCanvas && !open ? "dialog" : undefined}
        aria-modal={!inCanvas && !open ? true : undefined}
        aria-label={!inCanvas && !open ? "Buka undangan pernikahan" : undefined}
        className={`${styles.cover} ${leaving ? styles.coverLeaving : ""}`}
      >
        <Backdrop />
        <HeritageFrame className={styles.coverFrame}>
          <p className={styles.eyebrow}>{p.tagline ?? "The Wedding Of"}</p>
          <h1>{p.names ?? "Nama Mempelai"}</h1>
          <div className={styles.rule} />
          <p className={styles.coverGreeting}>
            {p.note ?? "Kepada Bapak/Ibu/Saudara/i"}
          </p>
          {guestName ? <p className={styles.coverGuest}>{guestName}</p> : null}
          <button
            type="button"
            className={styles.button}
            onClick={enter}
            disabled={loading || leaving}
          >
            {p.button_label ?? "Buka Undangan"}
          </button>
        </HeritageFrame>
      </div>
    </CoverShell>
  );
}
