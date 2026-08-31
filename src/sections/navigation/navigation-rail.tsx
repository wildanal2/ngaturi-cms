"use client";

import type { SectionRenderProps } from "../types";
import { NavIcon, scrollToSection, useNavItems } from "./nav-shared";

/** Vertical icon rail floating against the left or right edge, mid-height. */
export function NavigationRail({
  props,
  siblingTypes = [],
  inCanvas,
}: SectionRenderProps) {
  const items = useNavItems(siblingTypes, 7);
  if (items.length < 2) return null;
  const left = (props as { s_side?: string }).s_side === "left";

  return (
    <nav
      className={`${inCanvas ? "absolute" : "fixed"} top-1/2 z-40 -translate-y-1/2 ${
        left ? "left-2" : "right-2"
      }`}
    >
      <div className="flex flex-col items-center gap-1 rounded-full bg-black/70 px-1.5 py-2 text-white shadow-xl backdrop-blur">
        {items.map((it) => (
          <button
            key={it.type}
            onClick={() => scrollToSection(it.type, inCanvas)}
            aria-label={it.label}
            title={it.label}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"
          >
            <NavIcon name={it.icon} size={16} />
          </button>
        ))}
      </div>
    </nav>
  );
}
