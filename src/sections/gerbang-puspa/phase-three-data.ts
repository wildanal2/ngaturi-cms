export function invitationPhone(prefix: string, value: string) {
  const phone = value.trim();
  if (!phone || phone.startsWith("+")) return phone;
  return `${prefix}${phone.replace(/^0/, "")}`;
}

export function wishInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`
      : Array.from(words[0] ?? "")
          .slice(0, 2)
          .join("")
  ).toUpperCase();
}

export function wishTimestamp(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  const day = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${day} at ${time}`;
}

/** Only adjacent native wrappers are paired; repeated sections keep separate owners. */
export function adjacentGerbangSection(
  element: HTMLElement,
  direction: "previous" | "next",
) {
  let boundary = element.closest<HTMLElement>(
    "[data-section], [data-section-id]",
  );
  while (
    boundary &&
    !(direction === "previous"
      ? boundary.previousElementSibling
      : boundary.nextElementSibling)
  ) {
    const parent = boundary.parentElement;
    if (
      !parent ||
      parent.querySelectorAll("[data-section], [data-section-id]").length !== 1
    )
      break;
    boundary = parent;
  }
  return direction === "previous"
    ? boundary?.previousElementSibling
    : boundary?.nextElementSibling;
}
