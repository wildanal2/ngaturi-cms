import { gsap } from "gsap";

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
  const panels = [...root.querySelectorAll<HTMLElement>("[data-world-panel]")];
  const rail = root.querySelector<HTMLElement>("[data-world-rail]");
  const camera = root.querySelector<HTMLElement>("[data-world-camera]");
  const owner = scroller ?? window;
  const chapters = new Map<HTMLElement, number>();
  const ranges: { node: HTMLElement; start: number; end: number }[] = [];
  let distance = 1;
  let start = 0;
  let raf = 0;
  let lastSize = "";
  let disposed = false;
  const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);
  const context = gsap.context(() => {}, root);
  const timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  let time = 0;
  const show = (node: HTMLElement, duration: number) => {
    chapters.set(node, time + 3);
    ranges.push({ node, start: time, end: time + duration });
    timeline.fromTo(
      node,
      { autoAlpha: time === 0 ? 1 : 0 },
      { autoAlpha: 1, duration: 1 },
      time,
    );
    timeline.to(node, { autoAlpha: 0, duration: 1 }, time + duration - 1);
  };
  try {
    context.add(() => {
      root.dataset.enhanced = "true";
      gsap.set(scenes, { autoAlpha: 0 });
      for (const scene of scenes) {
        const kind = scene.dataset.scene;
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
          const betweenPortalDuration =
            worldSettleDuration + worldHoldDuration;
          const duration =
            Math.max(8, photoCount * 3) +
            eventPanels.length * portalDuration +
            Math.max(0, eventPanels.length - 1) * betweenPortalDuration +
            3;
          show(scene, duration);
          timeline.fromTo(
            camera,
            { scale: 0.64 },
            { scale: 0.78, duration: 3 },
            time,
          );
          let cursor = time + 3;
          if (photoCount > 0) {
            panels
              .slice(0, photoCount)
              .forEach((panel, i) => chapters.set(panel, cursor + i * 3));
            timeline.fromTo(
              rail,
              { x: 0 },
              {
                x: () => -(photoCount - 1) * viewport.clientWidth,
                duration: Math.max(5, photoCount * 3 - 3),
              },
              cursor,
            );
            cursor += Math.max(5, photoCount * 3 - 3);
          } else {
            cursor += 5;
          }
          for (const [portalIndex, panel] of eventPanels.entries()) {
            const index = panels.indexOf(panel);
            timeline.to(
              rail,
              {
                x: () => -index * viewport.clientWidth,
                duration: portalTraverseDuration,
              },
              cursor,
            );
            timeline.to(
              camera,
              {
                scale: () =>
                  Math.min(
                    1.35,
                    (viewport.clientHeight - 110) / panel.offsetHeight,
                  ),
                duration: portalEnterDuration,
              },
              cursor + portalTraverseDuration,
            );
            chapters.set(
              panel,
              cursor + portalTraverseDuration + portalEnterDuration + 1,
            );
            // A six-unit hold makes the editable event and CTA comfortable to read.
            const exitAt =
              cursor +
              portalTraverseDuration +
              portalEnterDuration +
              portalHoldDuration;
            timeline.to(
              camera,
              { scale: 0.78, duration: portalExitDuration },
              exitAt,
            );
            cursor += portalDuration;

            if (portalIndex < eventPanels.length - 1) {
              // After leaving Akad, spend explicit scroll progress back at
              // world scale before the rail starts travelling to Reception.
              timeline.to(
                camera,
                { scale: 0.64, yPercent: 0, duration: worldSettleDuration },
                cursor,
              );
              timeline.to(
                camera,
                { scale: 0.64, yPercent: 0, duration: worldHoldDuration },
                cursor + worldSettleDuration,
              );
              cursor += betweenPortalDuration;
            }
          }
          timeline.to(
            camera,
            { scale: 0.7, yPercent: -10, duration: 3 },
            time + duration - 3,
          );
          time += duration - 1;
          continue;
        }
        const duration = kind === "couple" ? 14 : 11;
        show(scene, duration);
        const body = scene.firstElementChild;
        if (kind === "entrance") {
          timeline.fromTo(
            body,
            { scale: 0.6 },
            { scale: 1, duration: 6 },
            time,
          );
          timeline.to(
            body,
            { scale: 3.4, yPercent: 12, duration: 5 },
            time + 6,
          );
        } else if (kind === "couple") {
          timeline.fromTo(
            body,
            { scale: 0.94, xPercent: 0 },
            { scale: 1, xPercent: 0, duration: 6 },
            time,
          );
          timeline.to(
            body,
            { scale: 0.9, xPercent: 0, duration: 5 },
            time + 9,
          );
          const people = scene.querySelectorAll("[data-couple-person]");
          people.forEach((person, i) =>
            timeline.fromTo(
              person,
              { y: i ? 24 : -24 },
              { y: i ? -12 : 12, duration },
              time,
            ),
          );
        } else if (kind === "quote") {
          timeline.fromTo(
            body,
            { scale: 0.96 },
            { scale: 0.9, yPercent: -3, duration },
            time,
          );
        } else if (kind === "venue") {
          timeline.fromTo(
            body,
            { scale: 0.65, yPercent: 20 },
            { scale: 1, yPercent: 0, duration: 7 },
            time,
          );
        } else {
          timeline.fromTo(body, { scale: 0.96 }, { scale: 0.82, duration }, time);
          // Leave the final framing visible while scrolling into functional content.
          timeline.to(scene, { autoAlpha: 1, duration: 0 }, time + duration);
        }
        time += duration - 1;
      }
      root.querySelectorAll<HTMLElement>("[data-depth]").forEach((layer) => {
        const depth = Number(layer.dataset.depth);
        timeline.fromTo(
          layer,
          { yPercent: depth * 3, xPercent: depth * -1.5, scale: 1.05 },
          {
            yPercent: depth * -5,
            xPercent: depth * 2,
            scale: 1.05 + depth * 0.045,
            duration: time + 1,
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
      const progress = Math.max(
        0,
        Math.min(1, (scrollTop() - start) / distance),
      );
      timeline.progress(progress);
      const now = timeline.time();
      for (const range of ranges) {
        const active =
          now >= range.start && (now < range.end || range === ranges.at(-1));
        range.node.inert = !active;
      }
      // Off-camera links must never receive keyboard focus.
      for (const panel of panels) {
        const box = panel.getBoundingClientRect();
        const view = viewport.getBoundingClientRect();
        panel.inert = box.right < view.left + 20 || box.left > view.right - 20;
      }
    };
    const requestRender = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const measure = () => {
      if (disposed) return;
      const height = scroller?.clientHeight ?? window.innerHeight;
      const size = `${height}:${root.clientWidth}:${panels.map((panel) => panel.offsetHeight).join(",")}`;
      if (size !== lastSize) {
        lastSize = size;
        distance = (time / 8) * height;
        root.style.setProperty("--cinema-height", `${height}px`);
        root.style.height = `${distance + height}px`;
        timeline.invalidate();
      }
      start =
        root.getBoundingClientRect().top +
        scrollTop() -
        (scroller?.getBoundingClientRect().top ?? 0);
      render();
    };
    const seek = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const node = [...chapters.keys()].find(
        (el) =>
          el.dataset.sectionId === id ||
          el.closest("[data-section-id]")?.getAttribute("data-section-id") ===
            id,
      );
      if (!node) return;
      event.preventDefault();
      owner.scrollTo({
        top: start + (chapters.get(node)! / timeline.duration()) * distance,
        behavior: "instant",
      });
      render();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(scroller ?? document.documentElement);
    resize.observe(root);
    panels.forEach((panel) => resize.observe(panel));
    owner.addEventListener("scroll", requestRender, { passive: true });
    root.addEventListener("cinematic:seek", seek);
    measure();
    return () => {
      disposed = true;
      resize.disconnect();
      cancelAnimationFrame(raf);
      owner.removeEventListener("scroll", requestRender);
      root.removeEventListener("cinematic:seek", seek);
      timeline.kill();
      context.revert();
      delete root.dataset.enhanced;
      root.style.removeProperty("height");
      root.style.removeProperty("--cinema-height");
      [...scenes, ...panels].forEach((node) => {
        node.inert = false;
      });
    };
  } catch (error) {
    timeline.kill();
    context.revert();
    delete root.dataset.enhanced;
    root.style.removeProperty("height");
    throw error;
  }
}
