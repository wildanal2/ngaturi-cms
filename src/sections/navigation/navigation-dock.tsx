"use client";

import type { SectionRenderProps } from "../types";
import { NavIcon, scrollToSection, useNavItems } from "./nav-shared";

/** Compact rounded pill dock, centred and floating above the bottom edge. */
export function NavigationDock({ siblingTypes = [], inCanvas }: SectionRenderProps) {
  const items = useNavItems(siblingTypes, 5);
  if (items.length < 2) return null;

  return (
    <nav
      className={`${
        inCanvas ? "absolute" : "fixed"
      } bottom-4 left-1/2 z-40 -translate-x-1/2`}
    >
      <div className="flex items-center gap-1 rounded-full bg-black/75 px-2 py-1.5 text-white shadow-xl backdrop-blur">
        {items.map((it) => (
          <button
            key={it.type}
            onClick={() => scrollToSection(it.type, inCanvas)}
            aria-label={it.label}
            title={it.label}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"
          >
            <NavIcon name={it.icon} size={17} />
          </button>
        ))}
      </div>
    </nav>
  );
}
