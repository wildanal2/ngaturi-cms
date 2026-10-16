"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { House, Users, CalendarDays, Images, MailCheck } from "lucide-react";
import type { SectionData } from "../types";
import { useGerbangPuspa } from "./opening";
import {
  gerbangActiveTarget,
  gerbangNavigationEnabled,
  gerbangNavigationTargets,
} from "./navigation-data";
import { sectionHandoff } from "./opening-handoff";
import styles from "./navigation.module.css";

const icons = { House, Users, CalendarDays, Images, MailCheck };

/** Template chrome has one owner, even when saved data contains generic navigation. */
export function GerbangPuspaNavigation({
  sections,
  surface,
  inCanvas,
}: {
  sections: readonly SectionData[];
  surface: RefObject<HTMLElement | null>;
  inCanvas: boolean;
}) {
  const { stage, reducedMotion } = useGerbangPuspa();
  const targets = gerbangNavigationTargets(sections);
  const [active, setActive] = useState("home");
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const cancelScroll = useRef<(() => void) | undefined>(undefined);
  const signature = JSON.stringify(targets);

  useEffect(() => {
    const root = surface.current;
    if (!root) return;
    const device = inCanvas
      ? root.closest<HTMLElement>("[data-device-scroller]")
      : null;
    const host = inCanvas
      ? root.closest<HTMLElement>("[data-device-frame-viewport]")
      : null;
    const owner = device ?? window;
    let frame = 0;
    const members = JSON.parse(signature) as typeof targets;
    const owners = new Map(
      members.flatMap((target) =>
        target.sectionIds.map((id) => [id, target.key] as const),
      ),
    );
    const measure = () => {
      setViewport(host);
      const top = device?.getBoundingClientRect().top ?? 0;
      const line = top + (device?.clientHeight ?? window.innerHeight) * 0.32;
      // Include quiet sections too: reading Quote/Gift/Closing must not leave
      // a stale highlight on an earlier primary destination.
      const positions = [
        ...root.querySelectorAll<HTMLElement>("[data-section-id]"),
      ].flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return rect.height > 0
          ? [
              {
                key: owners.get(element.dataset.sectionId!) ?? "",
                top: rect.top,
              },
            ]
          : [];
      });
      setActive(
        gerbangActiveTarget(positions, line) ?? members[0]?.key ?? "home",
      );
    };
    const queue = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    queue();
    owner.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const resize = new ResizeObserver(queue);
    resize.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      owner.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      resize.disconnect();
    };
    // The serialized targets track content/order without resubscribing on every scroll.
  }, [surface, inCanvas, signature]);

  useEffect(() => () => cancelScroll.current?.(), []);
  if (!gerbangNavigationEnabled(sections) || targets.length < 2) return null;
  const hidden = stage !== "opened";
  const navigation = (
    <nav
      className={`${styles.dock} ${inCanvas ? styles.contained : ""}`}
      data-gp-navigation
      aria-label="Navigasi undangan"
      hidden={hidden}
      inert={hidden}
    >
      {targets.map((target) => {
        const Icon = icons[target.icon as keyof typeof icons];
        return (
          <button
            type="button"
            key={target.key}
            aria-current={active === target.key ? "location" : undefined}
            onClick={(event) => {
              const root = surface.current;
              const element =
                root &&
                [
                  ...root.querySelectorAll<HTMLElement>("[data-section-id]"),
                ].find((node) => node.dataset.sectionId === target.sectionId);
              if (!root || !element) return;
              cancelScroll.current?.();
              if (target.key === "rsvp" && !inCanvas) {
                const launch = element.querySelector<HTMLButtonElement>(
                  "[data-gp-rsvp-launch]",
                );
                if (launch) {
                  event.currentTarget.focus({ preventScroll: true });
                  launch.click();
                  return;
                }
              }
              // Normal native scrolling remains interruptible by the guest's next gesture.
              cancelScroll.current = sectionHandoff(
                root,
                element,
                reducedMotion,
              );
            }}
          >
            <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
            <span>{target.label}</span>
          </button>
        );
      })}
    </nav>
  );
  return inCanvas
    ? viewport
      ? createPortal(navigation, viewport)
      : null
    : navigation;
}
