import type { SectionData } from "../types";

const text = (value: unknown) => typeof value === "string" && !!value.trim();
const array = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value : [];

/** Availability follows authored, visible content. No section is moved or merged. */
export function gerbangNavigationTargets(sections: readonly SectionData[]) {
  const visible = [...sections]
    .filter((section) => section.visible !== false)
    .sort((a, b) => a.order - b.order);
  const groups = [
    { key: "home", label: "Beranda", icon: "House", types: ["hero"] },
    {
      key: "couple",
      label: "Mempelai",
      icon: "Users",
      types: ["couple-intro"],
    },
    {
      key: "events",
      label: "Acara",
      icon: "CalendarDays",
      types: ["countdown", "event-details", "map-location"],
    },
    { key: "gallery", label: "Galeri", icon: "Images", types: ["gallery"] },
    {
      key: "rsvp",
      label: "RSVP",
      icon: "MailCheck",
      types: ["rsvp", "guestbook"],
    },
  ];
  const meaningful = (section: SectionData) => {
    const p = section.props;
    switch (section.type) {
      case "hero":
        return text(p.couple_names) || text(p.background_image);
      case "couple-intro":
        return [p.bride, p.groom].some((person) => {
          const profile = person as Record<string, unknown> | undefined;
          return (
            profile &&
            [
              profile.name,
              profile.full_name,
              profile.parents,
              profile.photo,
            ].some(text)
          );
        });
      case "event-details":
        return array(p.events).length > 0;
      case "countdown":
        return (
          text(p.target_date) &&
          Number.isFinite(Date.parse(String(p.target_date)))
        );
      case "map-location":
        return [p.venue_name, p.address, p.maps_url, p.embed_url].some(text);
      case "gallery":
        return array(p.images).length > 0;
      default:
        return true;
    }
  };
  return groups.flatMap((group) => {
    const members = visible.filter(
      (s) => group.types.includes(s.type) && meaningful(s),
    );
    // A guestbook alone keeps its own truthful entry point, rather than an RSVP label.
    const target =
      group.key === "rsvp"
        ? members.find((s) => s.type === "rsvp")
        : members[0];
    return target
      ? [
          {
            key: group.key,
            label: group.label,
            icon: group.icon,
            sectionId: target.id,
            sectionIds: members.map((s) => s.id),
          },
        ]
      : [];
  });
}

export function gerbangNavigationEnabled(sections: readonly SectionData[]) {
  const authored = sections.filter((section) => section.type === "navigation");
  return (
    !authored.length || authored.some((section) => section.visible !== false)
  );
}

/** Geometry comes from the actual window/device scroller, including reordered groups. */
export function gerbangActiveTarget(
  positions: { key: string; top: number }[],
  readingLine: number,
) {
  const ordered = [...positions].sort((a, b) => a.top - b.top);
  return (
    ordered.filter((item) => item.top <= readingLine).at(-1)?.key ??
    ordered[0]?.key
  );
}
