"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { MailOpen } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { useOpen } from "./shell";
import { useLoadingPhase } from "../loading/context";
import {
  BotanicalBorder,
  DelimaSeal,
  Divider,
  Portal,
  PortraitMedia,
  serambiTheme,
  textProp,
} from "../serambi-delima/primitives";
import { useSerambiEntrance } from "../serambi-delima/use-entrance";
import styles from "../serambi-delima/serambi-delima.module.css";

export function CoverSerambiDelima({
  props,
  guestName,
  inCanvas,
}: SectionRenderProps) {
  const { open, reveal } = useOpen();
  const phase = useLoadingPhase();
  const loading = phase !== "complete" && !inCanvas;
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gate = useSerambiEntrance(inCanvas);
  const button = useRef<HTMLButtonElement>(null);
  const pointerEntry = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const element = gate.current;
    if (inCanvas || loading || !element) return;
    const owner = element.closest('[data-section="cover"]')?.parentElement
      ?.parentElement;
    if (open && !leaving) {
      const target = owner?.querySelector<HTMLElement>(
        "[data-serambi-hero-focus]",
      );
      if (target) {
        target.dataset.focusOrigin = pointerEntry.current
          ? "pointer"
          : "keyboard";
        target.focus({ preventScroll: true });
      }
      return;
    }
    // Isolate only this invitation's siblings, never the Builder device or document scroller.
    const saved: { node: HTMLElement; inert: boolean }[] = [];
    let current: HTMLElement | null = element;
    while (current && current !== owner && owner?.contains(current)) {
      for (const sibling of Array.from(current.parentElement?.children ?? [])) {
        if (sibling instanceof HTMLElement && sibling !== current) {
          saved.push({ node: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
    }
    button.current?.focus({ preventScroll: true });
    return () =>
      saved.forEach(({ node, inert }) => {
        node.inert = inert;
      });
  }, [gate, inCanvas, loading, open, leaving]);

  const enter = (event: MouseEvent<HTMLButtonElement>) => {
    if (inCanvas || loading || open) return;
    pointerEntry.current = event.detail > 0;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setLeaving(!reduced);
    reveal(); // Keep existing music playback within this user gesture, before the dissolve.
    if (!reduced) timer.current = setTimeout(() => setLeaving(false), 400);
  };

  return (
    <div
      ref={gate}
      className={`${serambiTheme} ${styles.cover} ${inCanvas ? styles.coverCanvas : ""}`}
      data-serambi-delima
      data-invitation-cover={inCanvas ? undefined : true}
      data-open={open ? "1" : "0"}
      data-leaving={leaving || undefined}
      data-motion={inCanvas ? "preview" : "pending"}
      hidden={!inCanvas && open && !leaving}
      role={!inCanvas && !open ? "dialog" : undefined}
      aria-modal={!inCanvas && !open ? true : undefined}
      aria-label={!inCanvas && !open ? "Buka undangan pernikahan" : undefined}
      onKeyDown={(event) => {
        if (!inCanvas && (!open || leaving) && event.key === "Tab") {
          event.preventDefault();
          button.current?.focus();
        }
      }}
    >
      <div className={styles.coverStage}>
        <div className={styles.coverPhoto} aria-hidden="true">
          <PortraitMedia src={textProp(props.background_image)} />
        </div>
        <Portal>
          <div className={styles.coverContent}>
            <header className={`${styles.coverHeading} ${styles.enterUp}`}>
              {textProp(props.tagline) ? (
                <p className={styles.eyebrow}>{textProp(props.tagline)}</p>
              ) : null}
              <h1 className={styles.coverNames}>
                {textProp(props.names, "Nama Mempelai")}
              </h1>
              <Divider />
            </header>
            <div className={styles.coverBreathingRoom} aria-hidden="true">
              <DelimaSeal className={styles.coverSeal} />
            </div>
            <div className={`${styles.guestCard} ${styles.enterUp}`}>
              {textProp(props.note) ? (
                <p className={styles.greeting}>{textProp(props.note)}</p>
              ) : null}
              {guestName ? (
                <p className={styles.guestName}>{guestName}</p>
              ) : null}
              <button
                ref={button}
                type="button"
                className={styles.button}
                onClick={enter}
                disabled={loading || leaving || inCanvas}
              >
                <MailOpen size={17} aria-hidden="true" />
                <span>{textProp(props.button_label) || "Buka Undangan"}</span>
              </button>
            </div>
          </div>
          <BotanicalBorder />
        </Portal>
      </div>
    </div>
  );
}
