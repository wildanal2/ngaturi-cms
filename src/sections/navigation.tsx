"use client";

import * as Icons from "lucide-react";
import type { SectionRenderProps } from "./types";

const TARGETS: { type: string; label: string; icon: string }[] = [
  { type: "hero", label: "Atas", icon: "Home" },
  { type: "couple-intro", label: "Mempelai", icon: "Users" },
  { type: "event-details", label: "Acara", icon: "CalendarClock" },
  { type: "gallery", label: "Galeri", icon: "Images" },
  { type: "map-location", label: "Lokasi", icon: "MapPin" },
  { type: "rsvp", label: "RSVP", icon: "CircleCheck" },
  { type: "guestbook", label: "Ucapan", icon: "MessageCircleHeart" },
  { type: "gift", label: "Hadiah", icon: "Gift" },
];

function Icon({ name }: { name: string }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
    name
  ];
  return C ? <C size={16} /> : null;
}

export function NavigationBar({
  siblingTypes = [],
  inCanvas,
}: SectionRenderProps) {
  const items = TARGETS.filter((t) => siblingTypes.includes(t.type)).slice(0, 6);
  if (items.length < 2) return null;

  function jump(type: string) {
    if (inCanvas) return;
    document
      .querySelector(`[data-section="${type}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      className={
        inCanvas
          ? "mx-auto max-w-lg px-2 py-2"
          : "fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg"
      }
    >
      <div className="m-2 flex justify-around rounded-2xl bg-black/75 px-1 py-1.5 text-white shadow-lg backdrop-blur">
        {items.map((it) => (
          <button
            key={it.type}
            onClick={() => jump(it.type)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] hover:bg-white/10"
          >
            <Icon name={it.icon} />
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
