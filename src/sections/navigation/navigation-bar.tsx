"use client";

import type { SectionRenderProps } from "../types";
import { NavIcon, scrollToSection, useNavItems } from "./nav-shared";

/** Full-width floating bar pinned to the bottom. */
export function NavigationBar({ siblingTypes = [], inCanvas }: SectionRenderProps) {
  const items = useNavItems(siblingTypes);
  if (items.length < 2) return null;

  return (
    <nav
      className={`${
        inCanvas ? "absolute" : "fixed"
      } inset-x-0 bottom-0 z-40 mx-auto max-w-lg`}
    >
      <div className="m-2 flex justify-around rounded-2xl bg-black/75 px-1 py-1.5 text-white shadow-lg backdrop-blur">
        {items.map((it) => (
          <button
            key={it.type}
            onClick={() => scrollToSection(it.type, inCanvas)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] hover:bg-white/10"
          >
            <NavIcon name={it.icon} />
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
