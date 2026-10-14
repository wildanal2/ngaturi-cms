import type { FormEvent, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RsvpCinematicVintage } from "./rsvp-cinematic-vintage";
import { animateCinematicScroll } from "../cinematic/scroll";

const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void)[],
}));
const submission = vi.hoisted(() => ({ state: "idle", onSubmit: vi.fn() }));
vi.mock("./use-rsvp", () => ({ useRsvp: () => submission }));
vi.mock("../cinematic/scroll", () => ({ animateCinematicScroll: vi.fn() }));
vi.mock("react", () => ({
  useId: () => "rsvp-test",
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    hooks.values[index] ??= { current: initial };
    return hooks.values[index];
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    hooks.values[index] ??= initial;
    return [
      hooks.values[index],
      (value: unknown) => {
        hooks.values[index] = value;
      },
    ];
  },
  useEffect: (effect: () => void) => hooks.effects.push(effect),
}));
function find(
  node: ReactElement,
  match: (element: ReactElement) => boolean,
): ReactElement | undefined {
  if (match(node)) return node;
  const children = (node.props as { children?: ReactElement | ReactElement[] })
    .children;
  for (const child of [children].flat())
    if (child && typeof child === "object") {
      const found = find(child, match);
      if (found) return found;
    }
}
const global = {
  font_family: "Cormorant",
  color_primary: "#521c2b",
  color_secondary: "#c4a56c",
  color_background: "#faf3e7",
  animation: "none" as const,
};
function render(inCanvas = false) {
  hooks.cursor = 0;
  hooks.effects = [];
  return RsvpCinematicVintage({
    props: {},
    global,
    invitationId: "invitation",
    inCanvas,
  });
}
beforeEach(() => {
  hooks.values = [];
  hooks.effects = [];
  submission.state = "idle";
  vi.clearAllMocks();
  vi.stubGlobal("window", { innerHeight: 844, scrollY: 1000 });
});
afterEach(() => vi.unstubAllGlobals());

describe("Cinematic RSVP confirmation", () => {
  it("preserves the form height and existing submit handler when resolving in the same chapter", () => {
    const tree = render();
    const form = find(tree, (element) => element.type === "form")!;
    const event = {
      currentTarget: { offsetHeight: 912 },
    } as unknown as FormEvent<HTMLFormElement>;
    (
      form.props as { onSubmit: (event: FormEvent<HTMLFormElement>) => void }
    ).onSubmit(event);
    expect(submission.onSubmit).toHaveBeenCalledWith(event);
    submission.state = "done";
    const success = find(
      render(),
      (element) => (element.props as { role?: string }).role === "status",
    )!;
    expect(
      (success.props as { style: { minHeight: number } }).style.minHeight,
    ).toBe(912);
    const focus = vi.fn();
    (hooks.values[0] as { current: unknown }).current = {
      focus,
      closest: () => null,
      querySelector: () => ({
        getBoundingClientRect: () => ({ top: 320, bottom: 360 }),
      }),
    };
    hooks.effects.forEach((effect) => effect());
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(animateCinematicScroll).not.toHaveBeenCalled();
  });

  it("reveals an off-screen confirmation through the Builder owner without scrolling the host page", () => {
    submission.state = "done";
    render(true);
    const owner = {
      scrollTop: 1000,
      clientHeight: 500,
      getBoundingClientRect: () => ({ top: 10 }),
    };
    (hooks.values[0] as { current: unknown }).current = {
      focus: vi.fn(),
      closest: () => owner,
      querySelector: () => ({
        getBoundingClientRect: () => ({ top: -100, bottom: -60 }),
      }),
    };
    hooks.effects.forEach((effect) => effect());
    expect(animateCinematicScroll).toHaveBeenCalledWith(owner, 640);
  });
});
