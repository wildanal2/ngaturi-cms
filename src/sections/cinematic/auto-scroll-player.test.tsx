import { afterEach, describe, expect, it, vi } from "vitest";
import { CinematicAutoScroll } from "./auto-scroll-player";
import { CinematicComposition } from "./composition";
import { getTemplate } from "@/lib/templates/catalog";

const hooks = vi.hoisted(() => ({
  anchor: null as unknown,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useRef: () => ({ current: hooks.anchor }),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));
const controller = vi.hoisted(() => ({ dispose: vi.fn() }));
const mount = vi.hoisted(() => vi.fn(() => controller));
vi.mock("./auto-scroll", () => ({ mountCinematicAutoScroll: mount }));
afterEach(() => {
  hooks.anchor = null;
  hooks.effects = [];
  vi.clearAllMocks();
});
function setup(native = true, legacy = false) {
  const cover = {};
  const root = {
    querySelector: () => (native ? cover : null),
    closest: () => (legacy ? { querySelector: () => cover } : null),
  };
  hooks.anchor = { closest: () => root };
  return { cover, root };
}
describe("Cinematic automatic player boundary", () => {
  it("opts in public Cinematic presentation while excluding Builder and simple mode", () => {
    const global = getTemplate("cinematic-vintage")!.global_settings;
    const enabled = (inCanvas = false, simple = false) =>
      CinematicComposition({
        sections: [],
        inCanvas,
        global: {
          ...global,
          presentationMode: simple ? "simple" : "cinematic",
        },
      }).props.children.at(-1).props.enabled;
    expect(enabled()).toBe(true);
    expect(enabled(true)).toBe(false);
    expect(enabled(false, true)).toBe(false);
  });
  it("never attaches a player to disabled previews or invitations without a Cover", () => {
    setup();
    CinematicAutoScroll({ enabled: false });
    hooks.effects[0]();
    expect(mount).not.toHaveBeenCalled();
    hooks.effects = [];
    setup(false);
    CinematicAutoScroll({ enabled: true });
    hooks.effects[0]();
    expect(mount).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "uses the existing Cover lifecycle and cleans up (legacy: %s)",
    (legacy) => {
      const f = setup(!legacy, legacy);
      CinematicAutoScroll({ enabled: true });
      const cleanup = hooks.effects[0]();
      expect(mount).toHaveBeenCalledWith(f.root, null, {
        cover: f.cover,
        plan: expect.any(Function),
      });
      cleanup?.();
      expect(controller.dispose).toHaveBeenCalledOnce();
    },
  );
});
