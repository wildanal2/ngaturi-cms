import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatchCompositionSeek, scrollToSection } from "./nav-shared";

afterEach(() => vi.unstubAllGlobals());

describe("composition navigation bridge", () => {
  it("dispatches an Sekar Jawa 3D target instead of creating a timeline", () => {
    const dispatchEvent = vi.fn((_event: Event) => false);
    const stage = { dispatchEvent };
    const section = {
      dataset: { sectionId: "gallery-id" },
      closest: vi.fn((selector: string) =>
        selector === "[data-sekar-jawa-3d-stage]" ? stage : null,
      ),
    } as unknown as HTMLElement;

    expect(dispatchCompositionSeek(section, "gallery")).toBe(true);
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<string>;
    expect(event.type).toBe("sekar-jawa-3d:navigate");
    expect(event.detail).toBe("gallery");
  });

  it("scrolls Sekar Jawa 3D Simple mode only inside DeviceFrame", () => {
    const scrollTo = vi.fn();
    const scroller = {
      scrollTop: 120,
      scrollTo,
      getBoundingClientRect: () => ({ top: 20 }),
      querySelector: vi.fn(),
    };
    const section = {
      dataset: { sectionId: "gift-id" },
      getBoundingClientRect: () => ({ top: 320 }),
      closest: vi.fn((selector: string) =>
        selector === "[data-sekar-jawa-3d-simple]" ? {} : null,
      ),
    };
    scroller.querySelector.mockReturnValue(section);
    const viewport = { querySelector: vi.fn(() => scroller) };
    const source = {
      closest: vi.fn(() => viewport),
    } as unknown as HTMLElement;

    scrollToSection("gift", true, source);

    expect(scrollTo).toHaveBeenCalledWith({ top: 420, behavior: "smooth" });
  });

  it("retains the existing Builder no-op outside Sekar Jawa 3D", () => {
    const scrollTo = vi.fn();
    const scroller = {
      scrollTop: 0,
      scrollTo,
      getBoundingClientRect: () => ({ top: 0 }),
      querySelector: vi.fn(),
    };
    const standardSection = {
      dataset: { sectionId: "hero-id" },
      closest: vi.fn(() => null),
    };
    scroller.querySelector.mockReturnValue(standardSection);
    const source = {
      closest: vi.fn(() => ({ querySelector: () => scroller })),
    } as unknown as HTMLElement;

    scrollToSection("hero", true, source);

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not change Cinematic Vintage Builder navigation behavior", () => {
    const dispatchEvent = vi.fn(() => false);
    const scrollTo = vi.fn();
    const cinematicSection = {
      dataset: { sectionId: "hero-id" },
      closest: vi.fn((selector: string) =>
        selector === "[data-cinematic-stage]" ? { dispatchEvent } : null,
      ),
    };
    const scroller = {
      scrollTop: 0,
      scrollTo,
      querySelector: vi.fn(() => cinematicSection),
    };
    const source = {
      closest: vi.fn(() => ({ querySelector: () => scroller })),
    } as unknown as HTMLElement;

    scrollToSection("hero", true, source);

    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
