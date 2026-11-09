export type CinematicPan = {
  at: number;
  pixels: number;
  node: HTMLElement;
};

/** Inserts content travel into owner scroll without advancing the GSAP scene. */
export function cinematicScrollMap(
  duration: number,
  baseDistance: number,
  pans: CinematicPan[],
) {
  let extra = 0;
  const segments = [...pans]
    .filter((pan) => pan.pixels > 0)
    .sort((a, b) => a.at - b.at)
    .map((pan) => {
      const start = (pan.at / duration) * baseDistance + extra;
      extra += pan.pixels;
      return { ...pan, start, end: start + pan.pixels };
    });
  const position = (time: number) =>
    (time / duration) * baseDistance +
    segments.reduce((sum, pan) => sum + (pan.at < time ? pan.pixels : 0), 0);
  const sample = (offset: number) => {
    let passed = 0;
    for (const pan of segments) {
      if (offset < pan.start)
        return {
          time: ((offset - passed) / baseDistance) * duration,
          panning: false,
        };
      if (offset < pan.end)
        return { time: pan.at, panning: offset > pan.start + 2 };
      passed += pan.pixels;
    }
    return {
      time: ((offset - passed) / baseDistance) * duration,
      panning: false,
    };
  };
  const apply = (offset: number) => {
    for (const pan of segments) {
      const traveled = Math.max(0, Math.min(pan.pixels, offset - pan.start));
      pan.node.style.translate = traveled ? `0 -${traveled}px` : "";
    }
    return sample(offset);
  };
  const clear = () =>
    segments.forEach((pan) => (pan.node.style.translate = ""));
  const bookmark = (offset: number) => {
    const pan = segments.find(
      (pan) => offset >= pan.start && offset <= pan.end,
    );
    return {
      time: sample(offset).time,
      node: pan?.node,
      progress: pan ? (offset - pan.start) / pan.pixels : 0,
    };
  };
  const restore = (anchor: ReturnType<typeof bookmark>) => {
    const pan = segments.find((pan) => pan.node === anchor.node);
    return pan
      ? pan.start + pan.pixels * anchor.progress
      : position(anchor.time);
  };
  // Finishing a reading pan is a resting point too. Without it, idle assistance
  // can rewind a chapter to its beginning after its last line has been read.
  const restingPositions = (beats: number[]) => [
    ...beats.map(position),
    ...segments.map((pan) => pan.end),
  ];
  return {
    distance: baseDistance + extra,
    traversals: segments,
    position,
    sample,
    apply,
    clear,
    bookmark,
    restore,
    restingPositions,
  };
}
