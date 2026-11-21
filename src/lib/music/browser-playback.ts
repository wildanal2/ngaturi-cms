let typeProbe: HTMLAudioElement | undefined;
/** HTMLMediaElement.canPlayType without a rendered element ("maybe" on the server). */
export function browserCanPlayType(type: string): string {
  if (typeof document === "undefined") return "maybe";
  typeProbe ??= document.createElement("audio");
  return typeProbe.canPlayType(type);
}

/** Hide results whose declared media type this browser reports it cannot decode. */
export function playableInBrowser<T extends { format?: string | null }>(
  tracks: T[],
  canPlayType: (type: string) => string,
): T[] {
  return tracks.filter((t) => !t.format || canPlayType(t.format) !== "");
}

type ProbeElement = Pick<
  HTMLAudioElement,
  "addEventListener" | "removeAttribute" | "load"
> & { preload: string; src: string };

/**
 * Resolve once the browser can read the track's metadata; reject on a media
 * error (404/403/expired/unsupported) or timeout. Used before a selection is
 * saved so a dead source never replaces a working one.
 */
export function probePlayable(
  url: string,
  {
    create = () => new Audio(),
    timeoutMs = 10_000,
  }: { create?: () => ProbeElement; timeoutMs?: number } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = create();
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      audio.removeAttribute("src");
      audio.load();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error("timeout")), timeoutMs);
    audio.addEventListener("loadedmetadata", () => finish());
    audio.addEventListener("error", () => finish(new Error("media error")));
    audio.preload = "metadata";
    audio.src = url;
  });
}
