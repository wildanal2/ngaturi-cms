"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SectionRenderProps } from "../types";
import { cinematicDestinations, cinematicRoot } from "../cinematic/chrome";
import {
  animateCinematicScroll,
  focusCinematicChapter,
} from "../cinematic/scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "../cinematic/cinematic.module.css";

function ChapterLabel({ label, from }: { label: string; from?: string }) {
  const [previous, setPrevious] = useState(label);
  useEffect(() => {
    if (previous === label) return;
    const timer = setTimeout(() => setPrevious(label), 220);
    return () => clearTimeout(timer);
  }, [label, previous]);
  return (
    <span className={styles.chapterLabel}>
      {previous !== label ? (
        <span aria-hidden="true" className={styles.labelLeaving}>
          {from ?? previous}
        </span>
      ) : null}
      <span key={label} className={styles.labelEntering}>
        {label}
      </span>
    </span>
  );
}

export function NavigationCinematicVintage({
  siblingTypes = [],
  inCanvas,
}: SectionRenderProps) {
  const initial = useMemo(
    () => cinematicDestinations(siblingTypes),
    [siblingTypes],
  );
  const [chapters, setChapters] = useState(initial);
  const [active, setActive] = useState({
    type: "hero",
    previousType: "hero",
    direction: "forward",
  });
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current && cinematicRoot(ref.current);
    if (!root) return;
    const owner = inCanvas
      ? root.closest<HTMLElement>("[data-device-scroller]")
      : window;
    if (!owner) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const ownerTop =
        owner instanceof HTMLElement ? owner.getBoundingClientRect().top : 0;
      const height =
        owner instanceof HTMLElement ? owner.clientHeight : window.innerHeight;
      const sections = [...root.querySelectorAll<HTMLElement>("[data-section]")];
      const rendered = cinematicDestinations(
        sections.map((section) => section.dataset.section!),
        true,
      );
      setChapters((previous) =>
        previous.map((item) => item.type).join() ===
        rendered.map((item) => item.type).join()
          ? previous
          : rendered,
      );
      const y = ownerTop + height * 0.3;
      const current = sections.find((section) => {
        // The controller already publishes the active cinematic scene. Its
        // transformed panels need no second set of navigation measurements.
        if (
          section.closest(
            "[data-cinematic-stage][data-enhanced]:not([data-linear])",
          )
        ) return false;
        const panels = [
          ...section.querySelectorAll<HTMLElement>("[data-world-panel]"),
        ];
        const boxes = (panels.length ? panels : [section]).map((node) =>
          node.getBoundingClientRect(),
        );
        return boxes.some((box) => box.top <= y && box.bottom > y);
      });
      const stage = [
        ...root.querySelectorAll<HTMLElement>(
          "[data-cinematic-stage][data-enhanced]:not([data-linear])",
        ),
      ].find((node) => {
        const box = node.getBoundingClientRect();
        return box.top <= y && box.bottom > y;
      });
      const focused =
        document.activeElement instanceof HTMLElement &&
        root.contains(document.activeElement) &&
        document.activeElement.matches(
          "input, textarea, select, [contenteditable]",
        )
          ? document.activeElement.closest<HTMLElement>("[data-section]")
          : null;
      const type = focused?.closest("[data-cinematic-interaction]")
        ? focused.dataset.section
        : (current?.dataset.section ?? stage?.dataset.activeSection);
      if (type)
        setActive((previous) =>
          previous.type === type
            ? previous
            : {
                type,
                previousType: previous.type,
                direction:
                  rendered.findIndex((item) => item.type === type) >=
                  rendered.findIndex((item) => item.type === previous.type)
                    ? "forward"
                    : "backward",
              },
        );
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new MutationObserver(request);
    observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["data-active-section", "data-linear"],
    });
    owner.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    document.addEventListener("focusin", request);
    update();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      owner.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      document.removeEventListener("focusin", request);
    };
  }, [inCanvas, initial]);
  const go = (type: string) => {
    if (!ref.current) return;
    const root = cinematicRoot(ref.current);
    const section = root?.querySelector<HTMLElement>(
      `[data-section="${type}"]`,
    );
    if (!section) return;
    const stage = section.closest("[data-cinematic-stage]");
    const seek = new CustomEvent("cinematic:seek", {
      detail: { sectionId: section.dataset.sectionId, behavior: "smooth" },
      cancelable: true,
    });
    if (!stage || stage.dispatchEvent(seek)) {
      root?.dispatchEvent(new Event("cinematic:seek"));
      // Gallery/Event wrappers use display:contents; their first panel owns layout.
      const target =
        section.querySelector<HTMLElement>("[data-world-panel]") ?? section;
      const owner = inCanvas
        ? root?.closest<HTMLElement>("[data-device-scroller]")
        : null;
      if (inCanvas && !owner) return;
      animateCinematicScroll(
        owner ?? window,
        target.getBoundingClientRect().top -
          (owner?.getBoundingClientRect().top ?? 0) +
          (owner?.scrollTop ?? window.scrollY),
        { onComplete: () => focusCinematicChapter(section) },
      );
    }
  };
  if (!chapters.length) return null;
  const index = Math.max(
    0,
    chapters.findIndex((item) => item.type === active.type),
  );
  const current = chapters[index];
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const fromIndex = chapters.findIndex(
    (item) => item.type === active.previousType,
  );
  return (
    <nav
      ref={ref}
      className={styles.cinematicDock}
      data-in-canvas={inCanvas || undefined}
      data-cinematic-pager
      aria-label="Perjalanan undangan"
    >
      <div className={styles.dockInner} data-direction={active.direction}>
        <button
          type="button"
          disabled={!previous}
          aria-label={
            previous ? `Bab sebelumnya: ${previous.label}` : "Awal perjalanan"
          }
          onClick={() => previous && go(previous.type)}
        >
          {previous ? (
            <>
              <ChevronLeft size={16} aria-hidden="true" />
              <ChapterLabel
                label={previous.label}
                from={chapters[fromIndex - 1]?.label}
              />
            </>
          ) : null}
        </button>
        <div className={styles.pagerCurrent} aria-current="location">
          <strong>
            <ChapterLabel
              label={current.label}
              from={chapters[fromIndex]?.label}
            />
          </strong>
        </div>
        <button
          type="button"
          disabled={!next}
          aria-label={
            next ? `Bab berikutnya: ${next.label}` : "Akhir perjalanan"
          }
          onClick={() => next && go(next.type)}
        >
          {next ? (
            <>
              <ChapterLabel
                label={next.label}
                from={chapters[fromIndex + 1]?.label}
              />
              <ChevronRight size={16} aria-hidden="true" />
            </>
          ) : null}
        </button>
      </div>
    </nav>
  );
}
