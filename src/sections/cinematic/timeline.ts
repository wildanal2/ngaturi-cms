import { gsap } from "gsap";
import { cinematicScrollMap, type CinematicPan } from "./scroll-map";
import { mountCinematicSettling } from "./settling";
import {
  registerCinematicViewportStage,
  prepareCinematicLayout,
  refreshCinematicViewport,
} from "./viewport";
import {
  cinematicStageAutoStops,
  registerCinematicAutoStage,
} from "./auto-scroll-plan";
import {
  animateCinematicScroll,
  cancelCinematicScroll,
  focusCinematicChapter,
  type CinematicSeekDetail,
} from "./scroll";

/** One paused master timeline, driven exclusively by the chosen native scroller.
 * CSS sticky owns layout: no global ScrollTrigger, pin spacer or body mutation. */
export function mountCinematicTimeline(
  root: HTMLElement,
  scroller: HTMLElement | null,
) {
  const viewport = root.querySelector<HTMLElement>(
    "[data-cinematic-viewport]",
  )!;
  const scenes = [...root.querySelectorAll<HTMLElement>("[data-scene]")];
  const originalVisibility = new Map(
    scenes.map((node) => [node, node.style.visibility]),
  );
  const restoreVisibility = () =>
    scenes.forEach((node) => {
      node.style.visibility = originalVisibility.get(node) ?? "";
    });
  const panels = [...root.querySelectorAll<HTMLElement>("[data-world-panel]")];
  const memories = [
    ...root.querySelectorAll<HTMLElement>("[data-story-memory]"),
  ];
  const memoryRanges: { node: HTMLElement; start: number; end: number }[] = [];
  const rail = root.querySelector<HTMLElement>("[data-world-rail]");
  const camera = root.querySelector<HTMLElement>("[data-world-camera]");
  const panelPosition = (panel: HTMLElement) =>
    -panel.offsetLeft + (viewport.clientWidth - panel.offsetWidth) / 2;
  const owner = scroller ?? window;
  const chapters = new Map<HTMLElement, number>();
  const beats: number[] = [];
  const rests = new Map<HTMLElement, number>();
  let settling: ReturnType<typeof mountCinematicSettling> | undefined;
  let unregisterAuto: (() => void) | undefined;
  let unregisterViewport: (() => void) | undefined;
  const ranges: { node: HTMLElement; start: number; end: number }[] = [];
  let distance = 1;
  let scrollMap = cinematicScrollMap(1, 1, []);
  let start = 0;
  let raf = 0;
  let lastSize = "";
  let disposed = false;
  let linear = false;
  let activeChapter: HTMLElement | undefined;
  let lastFrameOffset: number | undefined;
  let measuredWidth = 0;
  let measuredHeight = 0;
  const panAt = new Map<HTMLElement, number>();
  const clearPan = () => {
    scrollMap.clear();
    [...scenes, ...panels, ...memories].forEach((node) =>
      node.removeAttribute("data-cinematic-tall"),
    );
  };
  const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);
  const context = gsap.context(() => {}, root);
  const timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  let time = 0;
  const show = (node: HTMLElement, duration: number, exit = true) => {
    chapters.set(node, time + 3);
    ranges.push({ node, start: time, end: time + duration });
    timeline.fromTo(
      node,
      { autoAlpha: time === 0 ? 1 : 0 },
      { autoAlpha: 1, duration: 1 },
      time,
    );
    // The last scene leaves with native flow. Fading it out early would leave
    // an empty sticky viewport while a guest pauses before the next stage.
    if (exit && node !== scenes.at(-1))
      timeline.to(node, { autoAlpha: 0, duration: 1 }, time + duration - 1);
  };
  try {
    context.add(() => {
      root.dataset.enhanced = "true";
      gsap.set(scenes, { autoAlpha: 0 });
      for (const scene of scenes) {
        const kind = scene.dataset.scene;
        if (kind === "story") {
          const items = [
            ...scene.querySelectorAll<HTMLElement>("[data-story-memory]"),
          ];
          const duration = items.length * 6 + 1;
          show(scene, duration);
          rests.set(scene, time + 3);
          items.forEach((item, index) => {
            const at = time + index * 6;
            panAt.set(item, at + 3);
            beats.push(at + 3);
            memoryRanges.push({ node: item, start: at, end: at + 7 });
            timeline.fromTo(
              item,
              { autoAlpha: 0, y: 10 },
              { autoAlpha: 1, y: 0, duration: 1 },
              at,
            );
            timeline.to(item, { autoAlpha: 0, duration: 2 }, at + 5);
          });
          time += duration - 1;
          continue;
        }
        if (kind === "world") {
          const photoCount = panels.filter(
            (p) => !p.hasAttribute("data-event-portal"),
          ).length;
          const eventPanels = panels.filter((p) =>
            p.hasAttribute("data-event-portal"),
          );
          const portalTraverseDuration = 6;
          const portalEnterDuration = 3;
          const portalHoldDuration = 6;
          const portalExitDuration = 4;
          const portalDuration =
            portalTraverseDuration +
            portalEnterDuration +
            portalHoldDuration +
            portalExitDuration;
          const worldSettleDuration = 2;
          const worldHoldDuration = 3;
          const betweenPortalDuration = worldSettleDuration + worldHoldDuration;
          const duration =
            (photoCount ? Math.max(4, photoCount * 3) : 0) +
            eventPanels.length * portalDuration +
            Math.max(0, eventPanels.length - 1) * betweenPortalDuration +
            3;
          show(scene, duration);
          timeline.fromTo(
            camera,
            { scale: 0.94 },
            { scale: 1, duration: 3 },
            time,
          );
          let cursor = time + 3;
          if (photoCount > 0) {
            panels.slice(0, photoCount).forEach((panel, i) => {
              chapters.set(panel, cursor + i * 3);
              rests.set(panel, cursor + i * 3);
              panAt.set(panel, cursor + i * 3);
              beats.push(cursor + i * 3);
            });
            timeline.fromTo(
              rail,
              { x: () => panelPosition(panels[0]) },
              {
                x: () => panelPosition(panels[photoCount - 1]),
                duration: Math.max(1, photoCount * 3 - 3),
              },
              cursor,
            );
            cursor += Math.max(1, photoCount * 3 - 3);
          }
          for (const [portalIndex, panel] of eventPanels.entries()) {
            const index = panels.indexOf(panel);
            timeline.to(
              rail,
              {
                x: () => panelPosition(panels[index]),
                duration: portalTraverseDuration,
              },
              cursor,
            );
            timeline.to(
              camera,
              {
                scale: 1,
                duration: portalEnterDuration,
              },
              cursor + portalTraverseDuration,
            );
            chapters.set(
              panel,
              cursor + portalTraverseDuration + portalEnterDuration + 1,
            );
            beats.push(
              cursor + portalTraverseDuration + portalEnterDuration + 1,
            );
            rests.set(panel, chapters.get(panel)!);
            panAt.set(panel, chapters.get(panel)!);
            // A six-unit hold makes the editable event and CTA comfortable to read.
            const exitAt =
              cursor +
              portalTraverseDuration +
              portalEnterDuration +
              portalHoldDuration;
            timeline.to(
              camera,
              { scale: 0.94, duration: portalExitDuration },
              exitAt,
            );
            cursor += portalDuration;

            if (portalIndex < eventPanels.length - 1) {
              // After leaving Akad, spend explicit scroll progress back at
              // world scale before the rail starts travelling to Reception.
              timeline.to(
                camera,
                { scale: 0.94, yPercent: 0, duration: worldSettleDuration },
                cursor,
              );
              timeline.to(
                camera,
                { scale: 0.94, yPercent: 0, duration: worldHoldDuration },
                cursor + worldSettleDuration,
              );
              beats.push(cursor + worldSettleDuration + worldHoldDuration / 2);
              cursor += betweenPortalDuration;
            }
          }
          timeline.to(
            camera,
            { scale: 0.94, yPercent: -2, duration: 3 },
            time + duration - 3,
          );
          time += duration - 1;
          continue;
        }
        const duration = kind === "closing" ? 8 : kind === "couple" ? 14 : 11;
        show(scene, duration, kind !== "closing");
        beats.push(
          time +
            (kind === "couple"
              ? 7
              : kind === "venue"
                ? 8
                : kind === "closing"
                  ? 4
                  : 3),
        );
        rests.set(scene, beats.at(-1)!);
        panAt.set(scene, beats.at(-1)!);
        const body = scene.firstElementChild;
        if (kind === "entrance") {
          timeline.fromTo(
            body,
            { scale: 0.94 },
            { scale: 1, duration: 3 },
            time,
          );
          timeline.fromTo(
            scene.querySelector("[data-hero-photo]"),
            { scale: 1 },
            { scale: 1.025, duration: 8 },
            time + 3,
          );
        } else {
          timeline.fromTo(body, { y: 12 }, { y: 0, duration: 2 }, time);
        }
        time += duration - 1;
      }
      root.querySelectorAll<HTMLElement>("[data-depth]").forEach((layer) => {
        const depth = Number(layer.dataset.depth);
        timeline.fromTo(
          layer,
          { y: depth * 4, x: depth * -2 },
          {
            y: depth * -4,
            x: depth * 2,
            duration:
              scenes.length === 1 && scenes[0].dataset.scene === "closing"
                ? 4
                : time + 1,
          },
          0,
        );
      });
      timeline.fromTo(
        "[data-cinematic-progress]",
        { scaleX: 0 },
        { scaleX: 1, duration: time + 1 },
        0,
      );
    });
    const render = () => {
      raf = 0;
      // A resize can deliver scroll before ResizeObserver. Keep the last reading
      // anchor until the new geometry is measured in the same frame.
      if (
        measuredWidth &&
        (root.clientWidth !== measuredWidth ||
          (scroller?.clientHeight ?? window.innerHeight) !== measuredHeight)
      )
        return;
      const offset = Math.max(0, Math.min(distance, scrollTop() - start));
      if (!linear && offset === lastFrameOffset) return;
      lastFrameOffset = offset;
      const sample = scrollMap.apply(offset);
      timeline.progress(
        Math.max(0, Math.min(1, sample.time / timeline.duration())),
      );
      if (linear) {
        [...scenes, ...panels, ...memories].forEach((node) => {
          if (node.inert) node.inert = false;
        });
        delete root.dataset.activeSection;
        const probe =
          (scroller?.getBoundingClientRect().top ?? 0) +
          (scroller?.clientHeight ?? window.innerHeight) * 0.3;
        activeChapter =
          [
            ...scenes.filter((scene) => scene.dataset.scene !== "world"),
            ...panels,
          ].find((node) => {
            const box = node.getBoundingClientRect();
            return box.top <= probe && box.bottom > probe;
          }) ?? activeChapter;
        return;
      }
      const now = timeline.time();
      let activeSection: string | undefined;
      for (const range of ranges) {
        const active =
          now >= range.start && (now < range.end || range === ranges.at(-1));
        if (range.node.inert !== !active) range.node.inert = !active;
        const visibility = active ? "visible" : "hidden";
        if (range.node.style.visibility !== visibility)
          range.node.style.visibility = visibility;
        if (active && range.node.dataset.section) {
          activeSection = range.node.dataset.section;
          activeChapter = range.node;
        }
      }
      for (const range of memoryRanges) {
        const inactive = now < range.start || now >= range.end;
        if (range.node.inert !== inactive) range.node.inert = inactive;
      }
      // Read all camera geometry before changing focusability. Interleaving an
      // inert write with the next panel read forces a style update per panel.
      const world = scenes.find((scene) => scene.dataset.scene === "world");
      if (panels.length && world && !world.inert) {
        const view = viewport.getBoundingClientRect();
        const boxes = panels.map((panel) => panel.getBoundingClientRect());
        let nearestPanel: HTMLElement | undefined;
        let nearestDistance = Infinity;
        panels.forEach((panel, index) => {
          const box = boxes[index];
          const inactive =
            box.right < view.left + 20 || box.left > view.right - 20;
          if (panel.inert !== inactive) panel.inert = inactive;
          if (!inactive) {
            const offset = Math.abs(
              (box.left + box.right - view.left - view.right) / 2,
            );
            if (offset < nearestDistance) {
              nearestDistance = offset;
              nearestPanel = panel;
            }
          }
        });
        if (nearestPanel) {
          activeChapter = nearestPanel;
          activeSection =
            nearestPanel.closest<HTMLElement>("[data-section]")?.dataset
              .section ?? "gallery";
          const gallery = nearestPanel.closest<HTMLElement>(
            "[data-gallery-frames]",
          );
          if (
            gallery &&
            gallery.dataset.activeGalleryIndex !==
              nearestPanel.dataset.galleryIndex
          )
            gallery.dataset.activeGalleryIndex =
              nearestPanel.dataset.galleryIndex;
        }
      } else {
        // A hidden world cannot contribute a chapter or a focusable link.
        for (const panel of panels) if (!panel.inert) panel.inert = true;
      }
      if (activeSection && root.dataset.activeSection !== activeSection)
        root.dataset.activeSection = activeSection;
    };
    const requestRender = () => {
      settling?.onScroll();
      if (!raf) raf = requestAnimationFrame(render);
    };
    const measure = () => {
      if (disposed || !root.clientWidth) return;
      const coordinated = prepareCinematicLayout(root);
      const current = scrollTop();
      const anchor = scrollMap.bookmark(current - start);
      const wasLinear = linear;
      const within =
        !coordinated &&
        !!lastSize &&
        current >= start &&
        (wasLinear
          ? root.getBoundingClientRect().bottom >
            (scroller?.getBoundingClientRect().top ?? 0)
          : current <= start + distance);
      const previousChapter = activeChapter;
      const oldChapterBox = wasLinear
        ? previousChapter?.getBoundingClientRect()
        : undefined;
      const linearProgress = oldChapterBox
        ? Math.max(
            0,
            Math.min(
              1,
              ((scroller?.getBoundingClientRect().top ?? 0) -
                oldChapterBox.top) /
                Math.max(
                  1,
                  oldChapterBox.bottom -
                    oldChapterBox.top -
                    (scroller?.clientHeight ?? window.innerHeight) +
                    120,
                ),
            ),
          )
        : 0;
      const height = scroller?.clientHeight ?? window.innerHeight;
      root.style.setProperty("--cinema-height", `${height}px`);
      const pixels = (value: string) => parseFloat(value) || 0;
      const padding = (node: HTMLElement) => {
        const style = getComputedStyle(node);
        return pixels(style.paddingTop) + pixels(style.paddingBottom);
      };
      const required = (node: HTMLElement) => {
        return [...node.children].reduce((sum, child) => {
          const childStyle = getComputedStyle(child);
          return (
            sum +
            Math.max((child as HTMLElement).offsetHeight, child.scrollHeight) +
            pixels(childStyle.marginTop) +
            pixels(childStyle.marginBottom)
          );
        }, padding(node));
      };
      // Tall content extends the chosen owner's journey instead of nesting a reader.
      // A short portrait Builder viewport must retain its cinematic controller.
      linear = height < 560 && root.clientWidth > height;
      root.toggleAttribute("data-linear", linear);
      const bottomClearance = Math.max(
        120,
        ...scenes.map((scene) => pixels(getComputedStyle(scene).paddingBottom)),
      );
      const available = Math.max(120, height - bottomClearance);
      const pans: CinematicPan[] = [];
      const addPan = (
        node: HTMLElement,
        at: number | undefined,
        needed: number,
      ) => {
        const pixels = linear ? 0 : Math.ceil(Math.max(0, needed));
        node.toggleAttribute("data-cinematic-tall", pixels > 0);
        if (pixels > 0 && at !== undefined) pans.push({ node, at, pixels });
        return pixels > 0;
      };
      for (const scene of scenes) {
        const body = scene.firstElementChild as HTMLElement | null;
        if (body && scene.dataset.scene === "story") {
          // Every framed memory traverses independently on the outer owner.
          const heading = body.querySelector<HTMLElement>(
            "[data-story-heading]",
          );
          const headingStyle = heading && getComputedStyle(heading);
          const headingHeight = heading
            ? heading.offsetHeight +
              pixels(headingStyle!.marginTop) +
              pixels(headingStyle!.marginBottom)
            : 0;
          let tall = false;
          scene
            .querySelectorAll<HTMLElement>("[data-story-memory]")
            .forEach((memory) => {
              const frame = memory.firstElementChild as HTMLElement | null;
              const reader = frame?.lastElementChild as HTMLElement | null;
              if (!frame || !reader) return;
              const space = Math.max(
                120,
                available - padding(body) - headingHeight - padding(frame),
              );
              tall =
                addPan(memory, panAt.get(memory), required(reader) - space) ||
                tall;
            });
          scene.toggleAttribute("data-cinematic-tall", tall);
        } else if (body && scene.dataset.scene !== "world")
          addPan(scene, panAt.get(scene), required(body) - available);
      }
      for (const panel of panels) {
        const frame = panel.firstElementChild as HTMLElement | null;
        const body = frame?.lastElementChild as HTMLElement | null;
        if (!frame || !body) continue;
        const space = Math.max(
          120,
          available - padding(panel) - padding(frame),
        );
        addPan(panel, panAt.get(panel), required(body) - space);
      }
      const size = `${linear}:${height}:${root.clientWidth}:${panels.map((panel) => panel.offsetHeight).join(",")}:${pans.map((pan) => `${pan.at}:${pan.pixels}`).join(",")}`;
      if (size !== lastSize) {
        const preserveLocally = !prepareCinematicLayout(root, true) && within;
        settling?.cancel();
        cancelCinematicScroll(owner);
        scrollMap.clear();
        lastSize = size;
        scrollMap = cinematicScrollMap(
          timeline.duration(),
          (time / 8) * height,
          pans,
        );
        distance = scrollMap.distance;
        root.style.height = linear ? "auto" : `${distance + height}px`;
        timeline.invalidate();
        // Initialize every future fromTo, then rewind atomically before paint.
        // Otherwise a scene left visible by linear mode can survive at a new size.
        timeline.progress(1, true);
        timeline.progress(0, true);
        lastFrameOffset = undefined;
        start =
          root.getBoundingClientRect().top +
          scrollTop() -
          (scroller?.getBoundingClientRect().top ?? 0);
        if (preserveLocally) {
          let destination = start + scrollMap.restore(anchor);
          if (linear && previousChapter)
            destination =
              previousChapter.getBoundingClientRect().top +
              scrollTop() -
              (scroller?.getBoundingClientRect().top ?? 0);
          else if (wasLinear && previousChapter) {
            const pan = scrollMap.traversals.find(
              (pan) => pan.node === previousChapter,
            );
            destination =
              start +
              (pan
                ? pan.start + pan.pixels * linearProgress
                : scrollMap.position(
                    rests.get(previousChapter) ??
                      chapters.get(previousChapter) ??
                      0,
                  ));
          }
          owner.scrollTo({
            top: Math.max(0, destination),
            behavior: "instant",
          });
        }
      }
      const nextStart =
        root.getBoundingClientRect().top +
        scrollTop() -
        (scroller?.getBoundingClientRect().top ?? 0);
      if (Math.abs(nextStart - start) > 1) prepareCinematicLayout(root, true);
      start = nextStart;
      measuredWidth = root.clientWidth;
      measuredHeight = height;
      render();
      refreshCinematicViewport(root);
    };
    const seek = (event: Event) => {
      const detail = (event as CustomEvent<CinematicSeekDetail>).detail;
      if (!detail) return;
      const id = typeof detail === "string" ? detail : detail.sectionId;
      if (linear) return;
      const matches = [...chapters.keys()].filter(
        (el) =>
          el.dataset.sectionId === id ||
          el.closest("[data-section-id]")?.getAttribute("data-section-id") ===
            id,
      );
      const node =
        matches[typeof detail === "string" ? 0 : (detail.panelIndex ?? 0)];
      if (!node) return;
      settling?.cancel();
      event.preventDefault();
      const smooth = typeof detail !== "string" && detail.behavior === "smooth";
      const destination =
        start +
        scrollMap.position(
          smooth
            ? (rests.get(node) ?? chapters.get(node)!)
            : chapters.get(node)!,
        );
      if (typeof detail !== "string" && detail.behavior === "smooth")
        animateCinematicScroll(owner, destination, {
          duration:
            typeof detail !== "string" && detail.panelIndex !== undefined
              ? 450
              : undefined,
          onFrame: render,
          onComplete: () => {
            if (typeof detail !== "string" && detail.panelIndex !== undefined)
              node
                .querySelector<HTMLElement>("button")
                ?.focus({ preventScroll: true });
            else
              focusCinematicChapter(
                node.closest<HTMLElement>("[data-section]") ?? node,
              );
          },
        });
      else {
        owner.scrollTo({ top: destination, behavior: "instant" });
        render();
      }
    };
    const resize = new ResizeObserver(measure);
    resize.observe(scroller ?? document.documentElement);
    resize.observe(root);
    // Natural-height forms/disclosures can move a later stage without resizing
    // that stage or the viewport. Refresh its cached origin only on those changes.
    for (
      let previous = root.previousElementSibling;
      previous;
      previous = previous.previousElementSibling
    )
      resize.observe(previous);
    panels.forEach((panel) => resize.observe(panel));
    scenes.forEach((scene) => {
      if (scene.firstElementChild) {
        resize.observe(scene.firstElementChild);
        [...scene.firstElementChild.children].forEach((child) =>
          resize.observe(child),
        );
      }
    });
    memories.forEach((memory) => {
      const reader = memory.firstElementChild?.lastElementChild;
      if (reader) {
        resize.observe(reader);
        [...reader.children].forEach((child) => resize.observe(child));
      }
    });
    root
      .querySelectorAll("img")
      .forEach((image) => image.addEventListener("load", measure));
    settling = mountCinematicSettling(root, scroller, () => {
      const current = scrollTop();
      const height = scroller?.clientHeight ?? window.innerHeight;
      const probe = (scroller?.getBoundingClientRect().top ?? 0) + height * 0.3;
      const box = root.getBoundingClientRect();
      if (linear || box.top > probe || box.bottom <= probe) return null;
      // While a tall chapter is being read, every owner position is a valid hold.
      // Snapping to either edge would skip unread content.
      if (scrollMap.sample(current - start).panning) return null;
      if (!activeChapter) return null;
      const beat = rests.get(activeChapter);
      const positions = [
        ...(beat === undefined ? [] : [start + scrollMap.position(beat)]),
        ...scrollMap.traversals
          .filter((pan) => pan.node === activeChapter)
          .map((pan) => start + pan.end),
      ];
      const nearest = positions.reduce<number | null>(
        (best, position) =>
          best === null ||
          Math.abs(position - current) < Math.abs(best - current)
            ? position
            : best,
        null,
      );
      return nearest;
    });
    owner.addEventListener("scroll", requestRender, { passive: true });
    root.addEventListener("cinematic:seek", seek);
    window.addEventListener("orientationchange", measure);
    void document.fonts?.ready.then(measure);
    measure();
    const restoreNode = (node: HTMLElement, progress: number) => {
      if (linear) return false;
      const id =
        node.closest<HTMLElement>("[data-section-id]")?.dataset.sectionId;
      const target = panAt.has(node)
        ? node
        : [...chapters.keys()].find(
            (el) =>
              el.dataset.sectionId === id ||
              el.closest<HTMLElement>("[data-section-id]")?.dataset
                .sectionId === id,
          );
      if (!target) return false;
      const pan = scrollMap.traversals.find((pan) => pan.node === target);
      const offset = pan
        ? pan.start + pan.pixels * progress
        : scrollMap.position(
            panAt.get(target) ?? rests.get(target) ?? chapters.get(target) ?? 0,
          );
      owner.scrollTo({ top: start + offset, behavior: "instant" });
      cancelAnimationFrame(raf);
      render();
      return true;
    };
    unregisterViewport = registerCinematicViewportStage(root, {
      measure,
      capture() {
        cancelAnimationFrame(raf);
        render();
        const raw = scrollTop() - start;
        const clamped = Math.max(0, Math.min(distance, raw));
        const anchor = scrollMap.bookmark(clamped);
        return {
          anchor,
          node: anchor.node ?? activeChapter ?? scenes[0],
          progress: anchor.progress,
          edge:
            (raw - clamped) / (scroller?.clientHeight ?? window.innerHeight),
        };
      },
      restore(snapshot) {
        if (linear) return false;
        owner.scrollTo({
          top:
            start +
            scrollMap.restore(snapshot.anchor) +
            (snapshot.edge ?? 0) *
              (scroller?.clientHeight ?? window.innerHeight),
          behavior: "instant",
        });
        cancelAnimationFrame(raf);
        render();
        return true;
      },
      restoreNode,
    });
    unregisterAuto = registerCinematicAutoStage(root, () =>
      cinematicStageAutoStops({
        root,
        start,
        map: scrollMap,
        rests: panAt,
        height: scroller?.clientHeight ?? window.innerHeight,
        duration: timeline.duration(),
        linear,
        scroller,
        closing: scenes.some((scene) => scene.dataset.scene === "closing"),
      }),
    );
    return () => {
      disposed = true;
      unregisterAuto?.();
      unregisterViewport?.();
      settling?.dispose();
      cancelCinematicScroll(owner, "seek");
      resize.disconnect();
      cancelAnimationFrame(raf);
      owner.removeEventListener("scroll", requestRender);
      root.removeEventListener("cinematic:seek", seek);
      window.removeEventListener("orientationchange", measure);
      timeline.kill();
      context.revert();
      restoreVisibility();
      clearPan();
      delete root.dataset.enhanced;
      delete root.dataset.linear;
      delete root.dataset.activeSection;
      root
        .querySelectorAll("img")
        .forEach((image) => image.removeEventListener("load", measure));
      root.style.removeProperty("height");
      root.style.removeProperty("--cinema-height");
      [...scenes, ...panels, ...memories].forEach((node) => {
        node.inert = false;
      });
    };
  } catch (error) {
    unregisterAuto?.();
    unregisterViewport?.();
    settling?.dispose();
    timeline.kill();
    context.revert();
    restoreVisibility();
    clearPan();
    delete root.dataset.enhanced;
    delete root.dataset.linear;
    root.style.removeProperty("height");
    root.style.removeProperty("--cinema-height");
    throw error;
  }
}
