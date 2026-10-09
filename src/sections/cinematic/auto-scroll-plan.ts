import type { cinematicScrollMap } from "./scroll-map";

export type CinematicAutoStop = {
  id: string;
  position: number;
  travelMs: number;
  holdMs: number;
  node: HTMLElement;
  reading?: boolean;
  final?: boolean;
};
type StageReader = () => CinematicAutoStop[];
const stages = new WeakMap<HTMLElement, StageReader>();

/** The existing controller retains ownership of measurement and timeline geometry. */
export function registerCinematicAutoStage(
  root: HTMLElement,
  read: StageReader,
) {
  stages.set(root, read);
  return () => stages.delete(root);
}

export function cinematicReadingHold(kind: string, text: string) {
  const minimum: Record<string, number> = {
    hero: 3500,
    "couple-intro": 7000,
    quote: 6000,
    story: 8500,
    countdown: 6500,
    gallery: 3000,
    "event-details": 12000,
    "map-location": 8500,
    rsvp: 18000,
    gift: 12000,
    guestbook: 16000,
    closing: 8000,
  };
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(minimum[kind] ?? 6000, Math.min(24000, words * 260));
}
const kindOf = (node: HTMLElement) =>
  node.closest<HTMLElement>("[data-section]")?.dataset.section ?? "story";
const readingTravel = (pixels: number, height: number) =>
  Math.max(7000, (pixels / Math.max(12, height * 0.022)) * 1000);

/** All Gallery frames, Story memories and portals use their real timeline holds. */
export function cinematicStageAutoStops({
  root,
  start,
  map,
  rests,
  height,
  duration,
  linear,
  closing,
  scroller,
}: {
  root: HTMLElement;
  start: number;
  map: ReturnType<typeof cinematicScrollMap>;
  rests: Map<HTMLElement, number>;
  height: number;
  duration: number;
  linear: boolean;
  closing: boolean;
  scroller: HTMLElement | null;
}): CinematicAutoStop[] {
  if (linear) {
    const stops = [
      ...root.querySelectorAll<HTMLElement>("[data-section]"),
    ].flatMap((section) => {
      const panels = [
        ...section.querySelectorAll<HTMLElement>("[data-world-panel]"),
      ];
      if (panels.length)
        return panels.flatMap((node, i) =>
          naturalCinematicStops(
            node,
            height,
            scroller,
            `${section.dataset.sectionId}:panel:${i}`,
          ),
        );
      const memories = [
        ...section.querySelectorAll<HTMLElement>("[data-story-memory]"),
      ];
      if (memories.length)
        return [
          {
            ...naturalCinematicStops(section, height, scroller)[0],
            holdMs: 2000,
          },
          ...memories.flatMap((node, i) =>
            naturalCinematicStops(
              node,
              height,
              scroller,
              `${section.dataset.sectionId}:memory:${i}`,
            ),
          ),
        ];
      return naturalCinematicStops(section, height, scroller);
    });
    if (closing && stops.length) stops.at(-1)!.final = true;
    return stops;
  }
  const stops: CinematicAutoStop[] = [];
  let previous = 0;
  [...rests]
    .sort((a, b) => a[1] - b[1])
    .forEach(([node, at], i) => {
      const id = `${node.closest<HTMLElement>("[data-section]")?.dataset.sectionId}:${i}`;
      stops.push({
        id: `${id}:rest`,
        node,
        position: start + map.position(at),
        travelMs: Math.max(2000, (at - previous) * 650),
        holdMs: cinematicReadingHold(kindOf(node), node.textContent ?? ""),
      });
      const pan = map.traversals.find((p) => p.node === node);
      if (pan)
        stops.push({
          id: `${id}:pan-end`,
          node,
          reading: true,
          position: start + pan.end,
          travelMs: readingTravel(pan.pixels, height),
          holdMs: 2500,
        });
      previous = at;
    });
  if (closing && stops.length) stops.at(-1)!.final = true;
  else
    stops.push({
      id: `${root.querySelector<HTMLElement>("[data-section]")?.dataset.sectionId}:exit`,
      node: root,
      position: start + map.distance,
      travelMs: Math.max(2000, (duration - previous) * 650),
      holdMs: 0,
    });
  return stops;
}

/** Interaction chapters and short-landscape scenes retain natural document height. */
export function naturalCinematicStops(
  node: HTMLElement,
  height: number,
  scroller: HTMLElement | null,
  id = node.dataset.sectionId ?? kindOf(node),
): CinematicAutoStop[] {
  const box = node.getBoundingClientRect();
  const start =
    box.top +
    (scroller?.scrollTop ?? window.scrollY) -
    (scroller?.getBoundingClientRect().top ?? 0);
  const end = Math.max(start, start + box.height - height + 100);
  const stops: CinematicAutoStop[] = [
    {
      id: `${id}:natural:0`,
      node,
      position: start,
      travelMs: 5000,
      holdMs: cinematicReadingHold(kindOf(node), node.textContent ?? ""),
    },
  ];
  const stride = height * 0.55;
  for (let position = start; position < end - 1;) {
    const next = Math.min(end, position + stride);
    stops.push({
      id: `${id}:natural:${stops.length}`,
      node,
      position: next,
      travelMs: Math.max(
        6000,
        ((next - position) / Math.max(14, height * 0.045)) * 1000,
      ),
      holdMs: 2500,
      reading: true,
    });
    position = next;
  }
  return stops;
}

/** Follow rendered order, omitting unavailable/empty chapters exactly as composition does. */
export function cinematicAutoPlan(
  root: HTMLElement,
  scroller: HTMLElement | null,
) {
  const height = scroller?.clientHeight ?? window.innerHeight;
  const chapters = [
    ...root.querySelectorAll<HTMLElement>(
      "[data-cinematic-stage], [data-cinematic-interaction]",
    ),
  ];
  if (!chapters.length || height <= 0) return null;
  const plan: CinematicAutoStop[] = [];
  for (const chapter of chapters) {
    if (chapter.hasAttribute("data-cinematic-stage")) {
      const read = stages.get(chapter);
      if (!read) return null;
      plan.push(...read());
    } else plan.push(...naturalCinematicStops(chapter, height, scroller));
  }
  const max = scroller
    ? Math.max(0, scroller.scrollHeight - height)
    : Math.max(0, document.documentElement.scrollHeight - height);
  return plan.map((stop) => ({
    ...stop,
    position: Math.max(0, Math.min(max, stop.position)),
  }));
}
