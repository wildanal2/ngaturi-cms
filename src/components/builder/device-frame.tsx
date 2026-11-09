"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { DevicePreset } from "./devices";

// Measure the mockup (including its bezel/label), never the invitation viewport.
// The sized parent reserves the transformed height in the Canvas flow.
function ScaledDevice({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, scale: 1 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const mockup = mockupRef.current;
    if (!container || !mockup) return;
    function measure() {
      if (!container || !mockup) return;
      const width = mockup.offsetWidth;
      const height = mockup.offsetHeight;
      if (!width || !container.clientWidth) return;
      const scale = Math.min(1, container.clientWidth / width);
      setSize((previous) =>
        previous.width === width &&
        previous.height === height &&
        previous.scale === scale
          ? previous
          : { width, height, scale },
      );
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(mockup);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <div
        className="relative mx-auto"
        style={{
          width: size.width * size.scale,
          height: size.height * size.scale,
        }}
      >
        <div
          ref={mockupRef}
          className="absolute top-0 left-0 w-max origin-top-left"
          style={{ transform: `scale(${size.scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Realistic device mockup at the device's true CSS width. */
export function DeviceFrame({
  preset,
  children,
  overlay,
}: {
  preset: DevicePreset;
  children: ReactNode;
  /** Non-scrolling layer pinned over the viewport (floating chrome: music FAB). */
  overlay?: ReactNode;
}) {
  const screen = (
    <div
      data-device-frame-viewport
      className="relative h-[var(--device-frame-viewport-height)] bg-white [--device-frame-viewport-height:var(--device-preset-height)] lg:[--device-frame-viewport-height:min(var(--device-preset-height),74vh)]"
      style={
        {
          width: preset.width,
          "--device-preset-height": `${preset.height}px`,
          "--device-frame-journey-height": `min(${preset.height * 10}px, 740vh)`,
        } as CSSProperties
      }
    >
      <div data-device-scroller className="h-full w-full overflow-y-auto">
        {children}
      </div>
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          {overlay}
        </div>
      ) : null}
    </div>
  );

  if (preset.category === "desktop") {
    return (
      <ScaledDevice>
        <div className="w-max">
          <div className="overflow-hidden rounded-t-xl border border-line bg-cream-200">
            <div className="flex gap-1.5 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-wine/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-forest/40" />
            </div>
            {screen}
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            {preset.label} · {preset.width}×{preset.height}
          </p>
        </div>
      </ScaledDevice>
    );
  }

  if (preset.category === "tablet") {
    return (
      <ScaledDevice>
        <div className="w-max">
          <div className="rounded-[1.75rem] border-[14px] border-ink bg-ink shadow-2xl">
            <div className="overflow-hidden rounded-lg">{screen}</div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            {preset.label} · {preset.width}×{preset.height}
          </p>
        </div>
      </ScaledDevice>
    );
  }

  // phone
  return (
    <ScaledDevice>
      <div className="w-max px-[3px]">
        <div className="relative rounded-[2.75rem] border-[13px] border-ink bg-ink shadow-2xl">
          {preset.notch === "island" ? (
            <div className="absolute top-2 left-1/2 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-ink" />
          ) : preset.notch === "notch" ? (
            <div className="absolute top-0 left-1/2 z-30 h-[22px] w-[150px] -translate-x-1/2 rounded-b-2xl bg-ink" />
          ) : preset.notch === "punch" ? (
            <div className="absolute top-2 left-1/2 z-30 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-black/40" />
          ) : null}
          <div className="absolute top-20 -left-[16px] h-12 w-[3px] rounded-l bg-ink/70" />
          <div className="absolute top-36 -right-[16px] h-16 w-[3px] rounded-r bg-ink/70" />
          <div className="relative overflow-hidden rounded-[1.9rem]">
            {screen}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          {preset.label} · {preset.width}×{preset.height}
        </p>
      </div>
    </ScaledDevice>
  );
}
