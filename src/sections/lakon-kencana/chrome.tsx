"use client";

import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { musicPlaybackUrl } from "@/lib/music/playback-url";
import { usePlayer, type MusicProps } from "../music/shared";
import { NavIcon } from "../navigation/nav-shared";
import { LAKON_NAV } from "./data";
import { lakonViewport, navigateLakon, useLakon } from "./presentation";
import styles from "./lakon-kencana.module.css";

type Destination = {
  node: HTMLElement;
  type: string;
  label: string;
  icon: string;
};
export function NavigationLakon({ inCanvas }: SectionRenderProps) {
  const { stage, root } = useLakon();
  const ref = useRef<HTMLElement>(null);
  const [targets, setTargets] = useState<Destination[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const element =
      root?.current ??
      nav
        .closest("[data-device-frame-viewport]")
        ?.querySelector<HTMLElement>("[data-lakon-root]");
    if (!element) return;
    const owner =
      element.closest<HTMLElement>("[data-device-scroller]") ?? window;
    let frame = 0;
    let destinations: Destination[] = [];
    const visible = () => {
      const viewport = lakonViewport(
        owner === window ? null : (owner as HTMLElement),
      );
      const passed = destinations.filter(
        (t) =>
          t.node.getBoundingClientRect().top <=
          viewport.top + viewport.height * 0.42,
      );
      setActive((passed.at(-1) ?? destinations[0])?.type ?? "");
    };
    const refresh = () => {
      destinations = LAKON_NAV.flatMap(([type, label, icon]) => {
        const node = [
          ...element.querySelectorAll<HTMLElement>("[data-lakon-scene]"),
        ].find(
          (n) =>
            n.dataset.lakonScene === type &&
            n.closest('[data-section-visible="false"]') === null,
        );
        return node ? [{ node, type, label, icon }] : [];
      }).sort((a, b) =>
        a.node.compareDocumentPosition(b.node) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      );
      setTargets(destinations);
      visible();
    };
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(visible);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-section-visible"],
    });
    owner.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      observer.disconnect();
      owner.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
    };
  }, [root, inCanvas]);
  const hidden = !inCanvas && stage !== "opened";
  return (
    <nav
      ref={ref}
      data-lakon-navigation
      className={`${styles.navigation} ${inCanvas ? styles.navigationCanvas : ""}`}
      aria-label="Bagian undangan"
      hidden={hidden || !targets.length}
      inert={hidden}
    >
      {targets.map((target) => (
        <button
          type="button"
          key={target.type}
          aria-current={active === target.type ? "location" : undefined}
          onClick={(e) => navigateLakon(e.currentTarget, target.node)}
        >
          <NavIcon name={target.icon} size={18} />
          <span>{target.label}</span>
        </button>
      ))}
    </nav>
  );
}
export function MusicLakon({ props, inCanvas, global }: SectionRenderProps) {
  const p = props as MusicProps;
  const url = musicPlaybackUrl(
    p.audio_url || global.music_url || "",
    p.track_id,
  );
  const { stage } = useLakon();
  const { ref, playing, toggle } = usePlayer(
    !!url,
    p.autoplay,
    p.start_at ?? 0,
  );
  const [failed, setFailed] = useState("");
  const error = !!url && failed === url;
  const label = error
    ? "Coba putar musik"
    : playing
      ? "Jeda musik"
      : "Putar musik";
  if (!url && !inCanvas) return null;
  const hidden = !inCanvas && stage !== "opened";
  return (
    <div
      data-lakon-music
      className={`${styles.music} ${inCanvas ? styles.musicCanvas : ""}`}
      hidden={hidden}
      inert={hidden}
    >
      {url && (
        <audio
          ref={ref}
          src={url}
          preload="none"
          onError={() => setFailed(url)}
        />
      )}
      <button
        type="button"
        className={styles.roundButton}
        aria-label={url ? label : "Pilih musik di Inspector"}
        aria-pressed={!!url && playing}
        title={p.track_title ? `${label} · ${p.track_title}` : label}
        disabled={!url}
        onClick={() => {
          if (error) {
            setFailed("");
            ref.current?.load();
          }
          toggle();
        }}
      >
        {!url ? (
          <Music2 size={19} />
        ) : playing ? (
          <Pause size={19} />
        ) : (
          <Play size={19} />
        )}
      </button>
      {error && (
        <span className={styles.musicError} role="status">
          Musik belum dapat diputar.
        </span>
      )}
    </div>
  );
}
