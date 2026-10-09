export interface CriticalAssetPlan {
  images?: HTMLImageElement[];
  imageUrls?: string[];
  fonts?: { family: string; weight?: number; sample?: string }[];
  audio?: HTMLAudioElement | null;
}

const preparedAudio = new WeakSet<HTMLAudioElement>();

function imageReady(image: HTMLImageElement, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", finish);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const loaded = () => {
      if (typeof image.decode === "function")
        void image
          .decode()
          .catch(() => {})
          .then(finish);
      else finish();
    };
    if (signal.aborted || !image.src) return finish();
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", finish, { once: true });
    signal.addEventListener("abort", finish, { once: true });
    if (image.complete) {
      if (image.naturalWidth > 0) loaded();
      else finish(); // A completed broken image must not delay entry.
    }
  });
}

function audioReady(audio: HTMLAudioElement, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      audio.removeEventListener("canplay", finish);
      audio.removeEventListener("error", finish);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    if (signal.aborted || audio.readyState >= 3 || audio.error) return finish();
    audio.addEventListener("canplay", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    signal.addEventListener("abort", finish, { once: true });
    if (!preparedAudio.has(audio)) {
      preparedAudio.add(audio);
      audio.preload = "auto";
      // Prepare the existing player, preserving the later user-gesture play().
      try {
        audio.load();
      } catch {
        finish();
      }
    }
  });
}

export function waitForCriticalAssets(
  plan: CriticalAssetPlan,
  signal: AbortSignal,
) {
  if (signal.aborted) return Promise.resolve();
  const images = [...(plan.images ?? [])];
  for (const url of new Set(plan.imageUrls ?? [])) {
    const image = new Image();
    image.src = url;
    images.push(image);
  }
  const tasks: Promise<unknown>[] = images.map((image) =>
    imageReady(image, signal),
  );
  if (plan.audio) tasks.push(audioReady(plan.audio, signal));
  if (document.fonts?.load) {
    for (const font of plan.fonts ?? []) {
      try {
        tasks.push(
          document.fonts.load(
            `${font.weight ?? 400} 16px ${font.family}`,
            font.sample ?? "Mempersiapkan kisah kami",
          ),
        );
      } catch {
        /* Unsupported font detection falls back to the rendered font. */
      }
    }
  }
  return Promise.allSettled(tasks).then(() => {});
}

export const LOADING_MINIMUM_MS = 400;
export const LOADING_DEADLINE_MS = 2500;
export const LOADING_DISSOLVE_MS = 350;

/** One bounded lifecycle. Cancel removes listeners and prevents late callbacks. */
export function startLoading(
  prepare: (signal: AbortSignal) => Promise<unknown>,
  ready: (reason: "ready" | "timeout") => void,
  elapsedMs = 0,
) {
  const abort = new AbortController();
  let minimum = false;
  let settled = false;
  let finished = false;
  const finish = (reason: "ready" | "timeout") => {
    if (finished) return;
    finished = true;
    clearTimeout(minTimer);
    clearTimeout(maxTimer);
    abort.abort();
    ready(reason);
  };
  const minTimer = setTimeout(
    () => {
      minimum = true;
      if (settled) finish("ready");
    },
    Math.max(0, LOADING_MINIMUM_MS - elapsedMs),
  );
  const maxTimer = setTimeout(
    () => finish("timeout"),
    Math.max(0, LOADING_DEADLINE_MS - elapsedMs),
  );
  try {
    void prepare(abort.signal)
      .catch(() => {})
      .then(() => {
        settled = true;
        if (minimum) finish("ready");
      });
  } catch {
    settled = true;
  }
  return () => {
    finished = true;
    clearTimeout(minTimer);
    clearTimeout(maxTimer);
    abort.abort();
  };
}
