import { cancelCinematicScroll } from "./scroll";

type Owner = Window | HTMLElement;
export type ReadingAnchor = {
  time: number;
  node: HTMLElement | undefined;
  progress: number;
};
type StageSnapshot = {
  anchor: ReadingAnchor;
  node: HTMLElement;
  progress: number;
  edge?: number;
};
type StageAdapter = {
  measure: () => void;
  capture: () => StageSnapshot;
  restore: (snapshot: StageSnapshot) => boolean;
  restoreNode: (node: HTMLElement, progress: number) => boolean;
};
type Bookmark =
  | { kind: "stage"; root: HTMLElement; snapshot: StageSnapshot }
  | { kind: "field"; node: HTMLElement; fraction: number }
  | { kind: "flow"; node: HTMLElement; progress: number; arrival: number };
const stages = new WeakMap<HTMLElement, StageAdapter>();
const controllers = new WeakMap<
  HTMLElement,
  ReturnType<typeof createViewport>
>();
const invitationOf = (node: HTMLElement) =>
  node.closest<HTMLElement>(".cinematic-invitation");

export function registerCinematicViewportStage(
  root: HTMLElement,
  adapter: StageAdapter,
) {
  stages.set(root, adapter);
  controllers.get(invitationOf(root)!)?.refresh();
  return () => {
    if (stages.get(root) === adapter) stages.delete(root);
  };
}
/** Called before a stage changes any geometry. Exactly one owner restores after layout. */
export function prepareCinematicLayout(root: HTMLElement, changed = false) {
  const controller = controllers.get(invitationOf(root)!);
  if (!controller) return false;
  controller.prepare(changed);
  return true;
}
export function refreshCinematicViewport(root: HTMLElement) {
  controllers.get(invitationOf(root)!)?.refresh();
}

function createViewport(root: HTMLElement, scroller: HTMLElement | null) {
  const owner: Owner = scroller ?? window;
  const top = () => scroller?.scrollTop ?? window.scrollY;
  const inset = () => scroller?.getBoundingClientRect().top ?? 0;
  const height = () =>
    scroller?.clientHeight ??
    (window.visualViewport?.scale === 1
      ? window.visualViewport.height
      : window.innerHeight);
  const size = () =>
    `${scroller?.clientWidth ?? window.innerWidth}:${scroller?.clientHeight ?? window.innerHeight}:${height()}`;
  let dimensions = size();
  let viewportHeight = height();
  let bookmark: Bookmark | null = null;
  let resizing = false;
  let disposed = false;
  let frame = 0;
  let restoreFrame = 0;
  let generation = 0;
  const editing = () =>
    document.activeElement instanceof HTMLElement &&
    root.contains(document.activeElement) &&
    !!document.activeElement.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
    );
  const focusedControl = (
    viewHeight: number,
  ): Extract<Bookmark, { kind: "field" }> | null => {
    const node = document.activeElement;
    if (
      !(node instanceof HTMLElement) ||
      !root.contains(node) ||
      !node.matches(
        'input,textarea,select,button,summary,a[href],[contenteditable]:not([contenteditable="false"])',
      ) ||
      node.closest(
        "dialog[open], [data-invitation-cover], [data-section=music], [data-section=navigation], [data-cinematic-pager], [data-cinematic-stage][data-enhanced]:not([data-linear])",
      )
    )
      return null;
    const box = node.getBoundingClientRect();
    return box.height &&
      box.top >= inset() &&
      box.bottom <= inset() + viewHeight
      ? {
          kind: "field",
          node,
          fraction: (box.top + box.height / 2 - inset()) / viewHeight,
        }
      : null;
  };
  const travel = (node: HTMLElement) =>
    Math.max(0, node.offsetHeight - height() + 164);
  const capture = () => {
    frame = 0;
    if (disposed || resizing || size() !== dimensions) return;
    if (
      !scroller &&
      root.querySelector('[data-invitation-cover][data-open="0"]')
    ) {
      bookmark = null;
      return;
    }
    const control = focusedControl(height());
    if (control) {
      bookmark = control;
      return;
    }
    const probe = inset() + height() * 0.3;
    const stage = [
      ...root.querySelectorAll<HTMLElement>(
        "[data-cinematic-stage][data-enhanced]:not([data-linear])",
      ),
    ].find((node) => {
      const box = node.getBoundingClientRect();
      return box.top <= probe && box.bottom > probe;
    });
    const adapter = stage && stages.get(stage);
    if (stage && adapter) {
      bookmark = { kind: "stage", root: stage, snapshot: adapter.capture() };
      return;
    }
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-section]")]
      .filter(
        (node) =>
          !["loading", "cover", "music", "navigation"].includes(
            node.dataset.section ?? "",
          ),
      )
      .flatMap((node) => {
        const panels = [
          ...node.querySelectorAll<HTMLElement>(
            "[data-world-panel], [data-story-memory]",
          ),
        ];
        return panels.length ? panels : [node];
      });
    const node = nodes.find((node) => {
      const box = node.getBoundingClientRect();
      return (
        box.height > 0 &&
        box.top <= probe &&
        box.bottom > probe &&
        getComputedStyle(node).visibility !== "hidden"
      );
    });
    if (node) {
      const box = node.getBoundingClientRect();
      bookmark = {
        kind: "flow",
        node,
        progress: Math.max(
          0,
          Math.min(1, (inset() - box.top) / Math.max(1, travel(node))),
        ),
        arrival: Math.max(0, (box.top - inset()) / height()),
      };
    } else bookmark = null;
  };
  const refresh = () => {
    if (!disposed && !resizing && !frame)
      frame = requestAnimationFrame(capture);
  };
  const restoreNode = (node: HTMLElement, progress: number, arrival = 0) => {
    if (!node.isConnected) return;
    const stage = node.closest<HTMLElement>(
      "[data-cinematic-stage][data-enhanced]:not([data-linear])",
    );
    if (stage && stages.get(stage)?.restoreNode(node, progress)) return;
    owner.scrollTo({
      top: Math.max(
        0,
        top() +
          node.getBoundingClientRect().top -
          inset() +
          travel(node) * progress -
          arrival * height(),
      ),
      behavior: "instant",
    });
  };
  const restore = (saved: Bookmark | null) => {
    if (!saved) return;
    if (saved.kind === "stage") {
      if (
        saved.root.isConnected &&
        stages.get(saved.root)?.restore(saved.snapshot)
      )
        return;
      restoreNode(saved.snapshot.node, saved.snapshot.progress);
    } else if (saved.kind === "field") {
      if (saved.node.isConnected) {
        const box = saved.node.getBoundingClientRect();
        owner.scrollTo({
          top: Math.max(
            0,
            top() +
              box.top -
              inset() +
              box.height / 2 -
              saved.fraction * height(),
          ),
          behavior: "instant",
        });
      }
    } else restoreNode(saved.node, saved.progress, saved.arrival);
  };
  const measureStages = () =>
    root
      .querySelectorAll<HTMLElement>("[data-cinematic-stage]")
      .forEach((stage) => stages.get(stage)?.measure());
  const prepare = (layoutChanged = false) => {
    if (disposed) return false;
    const next = size();
    const viewportChanged = next !== dimensions;
    if (!viewportChanged && (!layoutChanged || editing())) return resizing;
    let saved = bookmark;
    if (viewportChanged) saved = focusedControl(viewportHeight) ?? saved;
    dimensions = next;
    viewportHeight = height();
    if (resizing) return true;
    if (!saved) return false;
    resizing = true;
    const current = ++generation;
    cancelCinematicScroll(owner);
    cancelAnimationFrame(frame);
    frame = 0;
    // ResizeObserver updates all stage maps before this single native restore.
    restoreFrame = requestAnimationFrame(() => {
      if (disposed || current !== generation) return;
      measureStages();
      restoreFrame = requestAnimationFrame(() => {
        if (disposed || current !== generation) return;
        measureStages();
        restore(saved);
        resizing = false;
        restoreFrame = 0;
        root.dispatchEvent(new Event("cinematic:layout"));
        refresh();
      });
    });
    return true;
  };
  const resize = () => {
    prepare();
    refresh();
  };
  const input = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("dialog[open]"))
      return;
    if (resizing) {
      generation++;
      cancelAnimationFrame(restoreFrame);
      restoreFrame = 0;
      resizing = false;
    }
    bookmark = null;
    refresh();
  };
  owner.addEventListener("scroll", refresh, { passive: true });
  ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"].forEach(
    (event) => owner.addEventListener(event, input, { passive: true }),
  );
  root.addEventListener("cinematic:seek", input, true);
  root.addEventListener("focusin", refresh);
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  const observer = new ResizeObserver(resize);
  observer.observe(scroller ?? document.documentElement);
  const mutation = new MutationObserver(refresh);
  mutation.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: [
      "data-open",
      "data-enhanced",
      "data-linear",
      "data-active-section",
    ],
  });
  refresh();
  return {
    prepare,
    refresh,
    dispose() {
      disposed = true;
      generation++;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(restoreFrame);
      observer.disconnect();
      mutation.disconnect();
      owner.removeEventListener("scroll", refresh);
      ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"].forEach(
        (event) => owner.removeEventListener(event, input),
      );
      root.removeEventListener("cinematic:seek", input, true);
      root.removeEventListener("focusin", refresh);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    },
  };
}
export function mountCinematicViewport(
  root: HTMLElement,
  scroller: HTMLElement | null,
) {
  const controller = createViewport(root, scroller);
  controllers.set(root, controller);
  return () => {
    controller.dispose();
    if (controllers.get(root) === controller) controllers.delete(root);
  };
}
