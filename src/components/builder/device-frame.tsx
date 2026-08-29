"use client";

import type { ReactNode } from "react";
import type { PreviewDevice } from "@/stores/builder-store";

/** Realistic device mockup around the invitation preview. */
export function DeviceFrame({
  device,
  children,
}: {
  device: PreviewDevice;
  children: ReactNode;
}) {
  if (device === "mobile") {
    return (
      <div className="relative mx-auto w-[400px] max-w-full">
        <div className="relative rounded-[3rem] border-[14px] border-ink bg-ink shadow-2xl">
          {/* dynamic island */}
          <div className="absolute top-2.5 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-ink" />
          {/* side buttons */}
          <div className="absolute top-24 -left-[17px] h-14 w-[3px] rounded-l bg-ink/70" />
          <div className="absolute top-44 -right-[17px] h-20 w-[3px] rounded-r bg-ink/70" />
          <div className="relative max-h-[75vh] overflow-y-auto rounded-[2rem] bg-white">
            {children}
            <div className="sticky bottom-0 flex h-6 items-center justify-center bg-white/0">
              <div className="h-1 w-32 rounded-full bg-ink/25" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div className="relative mx-auto w-[720px] max-w-full">
        <div className="rounded-[2rem] border-[16px] border-ink bg-ink shadow-2xl">
          <div className="max-h-[75vh] overflow-y-auto rounded-2xl bg-white">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-[960px] max-w-full">
      <div className="overflow-hidden rounded-t-xl border border-line bg-cream-200">
        <div className="flex gap-1.5 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-wine/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-forest/40" />
        </div>
        <div className="max-h-[75vh] overflow-y-auto bg-white">{children}</div>
      </div>
    </div>
  );
}
