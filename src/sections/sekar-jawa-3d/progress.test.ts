import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindJourneyProgress,
  gateJourneyProgressUntilOpen,
  measureJourneyProgress,
  resolveJourneyScrollOwner,
  seekJourneyProgress,
  seekJourneyTarget,
} from "./progress";
import { getJourneyTargetProgress } from "./journey";

function elementOwner(overrides: Partial<HTMLElement> = {}) {
  return {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 400,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    scrollTo: vi.fn(),
    ...overrides,
  } as unknown as HTMLElement;
}

function windowOwner() {
  return {
    scrollY: 0,
    innerHeight: 600,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn(() => 17),
    cancelAnimationFrame: vi.fn(),
    scrollTo: vi.fn(),
  } as unknown as Window;
}

const documentOwner = (scrollHeight = 1600) =>
  ({
    documentElement: { scrollHeight },
    body: { scrollHeight },
  }) as unknown as Document;

afterEach(() => vi.unstubAllGlobals());

describe("Sekar Jawa 3D scroll ownership", () => {
  it("selects window publicly and the nearest DeviceFrame scroller in Builder", () => {
    const browserWindow = windowOwner();
    const scroller = elementOwner();
    const stage = {
      closest: vi.fn(() => scroller),
    } as unknown as HTMLElement;

    expect(resolveJourneyScrollOwner(stage, false, browserWindow)).toBe(
      browserWindow,
    );
    expect(resolveJourneyScrollOwner(stage, true, browserWindow)).toBe(
      scroller,
    );
    expect(stage.closest).toHaveBeenCalledWith("[data-device-scroller]");
  });

  it("never falls back to window when a Builder preview owner is missing", () => {
    const browserWindow = windowOwner();
    const stage = { closest: vi.fn(() => null) } as unknown as HTMLElement;
    expect(resolveJourneyScrollOwner(stage, true, browserWindow)).toBeNull();
  });

  it("normalizes both owner types, clamps to 0..1, and handles zero distance", () => {
    const browserWindow = windowOwner();
    const browserDocument = documentOwner();
    const element = elementOwner({ scrollTop: 300 });

    expect(
      measureJourneyProgress(element, browserWindow, browserDocument),
    ).toBe(0.5);
    expect(
      measureJourneyProgress(
        elementOwner({ scrollTop: 900 }),
        browserWindow,
        browserDocument,
      ),
    ).toBe(1);
    expect(
      measureJourneyProgress(
        elementOwner({ scrollTop: -20 }),
        browserWindow,
        browserDocument,
      ),
    ).toBe(0);
    expect(
      measureJourneyProgress(
        elementOwner({ scrollHeight: 400, clientHeight: 400 }),
        browserWindow,
        browserDocument,
      ),
    ).toBe(0);
  });

  it("seeks through the selected owner without touching the other owner", () => {
    const browserWindow = windowOwner();
    const browserDocument = documentOwner();
    const scroller = elementOwner();

    seekJourneyProgress(scroller, 0.25, browserWindow, browserDocument);

    expect(scroller.scrollTo).toHaveBeenCalledWith({
      top: 150,
      behavior: "auto",
    });
    expect(browserWindow.scrollTo).not.toHaveBeenCalled();
  });

  it("can reset the public owner to the journey entrance", () => {
    const browserWindow = windowOwner();
    seekJourneyProgress(browserWindow, 0, browserWindow, documentOwner());
    expect(browserWindow.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "auto",
    });
  });

  it("holds restored public progress at the entrance until the cover opens", () => {
    expect(gateJourneyProgressUntilOpen(0.97, true, false)).toBe(0);
    expect(gateJourneyProgressUntilOpen(0.97, true, true)).toBe(0.97);
    expect(gateJourneyProgressUntilOpen(0.65, false, false)).toBe(0.65);
  });

  it("seeks an authoritative navigation target on the public owner", () => {
    const browserWindow = windowOwner();
    seekJourneyTarget(browserWindow, "gallery", browserWindow, documentOwner());
    const { top, behavior } = vi.mocked(browserWindow.scrollTo).mock
      .calls[0][0] as unknown as ScrollToOptions;
    expect(top).toBeCloseTo(getJourneyTargetProgress("gallery")! * 1000);
    expect(behavior).toBe("auto");
  });

  it("seeks the same navigation target on DeviceFrame without using window", () => {
    const browserWindow = windowOwner();
    const scroller = elementOwner();
    expect(
      seekJourneyTarget(scroller, "gallery", browserWindow, documentOwner()),
    ).toBe(true);
    const { top, behavior } = vi.mocked(scroller.scrollTo).mock
      .calls[0][0] as unknown as ScrollToOptions;
    expect(top).toBeCloseTo(getJourneyTargetProgress("gallery")! * 600);
    expect(behavior).toBe("auto");
    expect(browserWindow.scrollTo).not.toHaveBeenCalled();
  });

  it("coalesces updates and cleans up scroll, resize, observer, and RAF", () => {
    let scrollListener: EventListener | undefined;
    const scroller = elementOwner({
      addEventListener: vi.fn((type, listener) => {
        if (type === "scroll") scrollListener = listener as EventListener;
      }),
    });
    const browserWindow = windowOwner();
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = disconnect;
      },
    );
    const stage = {} as HTMLElement;
    const progressRef = { current: 0 };

    const cleanup = bindJourneyProgress(
      scroller,
      stage,
      progressRef,
      browserWindow,
      documentOwner(),
    );
    scrollListener?.(new Event("scroll"));
    scrollListener?.(new Event("scroll"));
    cleanup();

    expect(browserWindow.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(scroller.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
    expect(browserWindow.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(observe).toHaveBeenCalledWith(stage);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(browserWindow.cancelAnimationFrame).toHaveBeenCalledWith(17);
  });
});
