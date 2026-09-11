import type { JourneyStop, Vector3Tuple } from "./types";

/**
 * One visual and semantic journey authority. Section keys use Ngaturi's
 * registry vocabulary; the entrance approach is intentionally visual-only.
 */
export const ENCHANTED_GARDEN_JOURNEY = [
  {
    id: "cover",
    range: [0, 0.08],
    camera: { position: [0, 3.2, 28], target: [0, 2.5, 12], fov: 48 },
    section: "cover",
    atmosphere: {
      fogColor: "#120d0a",
      fogNear: 10,
      fogFar: 55,
      lightIntensity: 1,
    },
  },
  {
    id: "entrance-approach",
    range: [0.08, 0.18],
    camera: { position: [0, 2.7, 21], target: [0, 2.2, 8], fov: 46 },
    atmosphere: {
      fogColor: "#120d0a",
      fogNear: 12,
      fogFar: 55,
      lightIntensity: 1.05,
    },
  },
  {
    id: "hero",
    range: [0.18, 0.3],
    camera: { position: [0, 2.3, 14.5], target: [0, 2, 2], fov: 45 },
    section: "hero",
    atmosphere: {
      fogColor: "#140e0b",
      fogNear: 10,
      fogFar: 50,
      lightIntensity: 1.1,
    },
  },
  {
    id: "quote",
    range: [0.3, 0.4],
    camera: { position: [-1.6, 2.3, 9.5], target: [0.3, 2, -1], fov: 44 },
    section: "quote",
    atmosphere: {
      fogColor: "#140e0b",
      fogNear: 10,
      fogFar: 48,
      lightIntensity: 1.05,
    },
  },
  {
    id: "couple-intro",
    range: [0.4, 0.5],
    camera: { position: [1.5, 2.2, 5], target: [-0.3, 2, -4], fov: 42 },
    section: "couple-intro",
    atmosphere: {
      fogColor: "#140f0c",
      fogNear: 9,
      fogFar: 46,
      lightIntensity: 1.15,
    },
  },
  {
    id: "story",
    range: [0.5, 0.59],
    camera: { position: [0, 3.2, 1.5], target: [0, 3.6, -6], fov: 48 },
    section: "story",
    atmosphere: {
      fogColor: "#150f0c",
      fogNear: 9,
      fogFar: 45,
      lightIntensity: 1.1,
    },
  },
  {
    id: "event-details",
    range: [0.59, 0.68],
    camera: { position: [-1.2, 2, -2], target: [0, 1.9, -10], fov: 42 },
    section: "event-details",
    atmosphere: {
      fogColor: "#16100c",
      fogNear: 8,
      fogFar: 42,
      lightIntensity: 1.2,
    },
  },
  {
    id: "map-location",
    range: [0.68, 0.74],
    camera: { position: [0.4, 2.05, -4], target: [-0.1, 1.9, -12], fov: 43 },
    section: "map-location",
    atmosphere: {
      fogColor: "#16100c",
      fogNear: 8,
      fogFar: 41,
      lightIntensity: 1.18,
    },
  },
  {
    id: "countdown",
    range: [0.74, 0.81],
    camera: { position: [1.3, 2.1, -6], target: [-0.2, 1.9, -14], fov: 43 },
    section: "countdown",
    atmosphere: {
      fogColor: "#16100c",
      fogNear: 8,
      fogFar: 40,
      lightIntensity: 1.15,
    },
  },
  {
    id: "gallery",
    range: [0.81, 0.89],
    camera: { position: [0, 2.1, -10], target: [0, 2, -18], fov: 44 },
    section: "gallery",
    atmosphere: {
      fogColor: "#17110d",
      fogNear: 8,
      fogFar: 40,
      lightIntensity: 1.2,
    },
  },
  {
    id: "rsvp",
    range: [0.89, 0.93],
    camera: { position: [-1, 1.9, -13.5], target: [0.2, 1.8, -21], fov: 42 },
    section: "rsvp",
    atmosphere: {
      fogColor: "#18120d",
      fogNear: 7,
      fogFar: 38,
      lightIntensity: 1.25,
    },
  },
  {
    id: "guestbook",
    range: [0.93, 0.95],
    camera: { position: [0, 1.9, -14.3], target: [0, 1.8, -21.5], fov: 42 },
    section: "guestbook",
    atmosphere: {
      fogColor: "#18120d",
      fogNear: 7,
      fogFar: 38,
      lightIntensity: 1.25,
    },
  },
  {
    id: "gift",
    range: [0.95, 0.97],
    camera: { position: [1, 1.9, -15], target: [-0.2, 1.8, -22], fov: 42 },
    section: "gift",
    atmosphere: {
      fogColor: "#18120d",
      fogNear: 7,
      fogFar: 38,
      lightIntensity: 1.25,
    },
  },
  {
    id: "closing",
    range: [0.97, 1],
    camera: { position: [0, 1.85, -17], target: [0, 1.9, -23.5], fov: 40 },
    section: "closing",
    atmosphere: {
      fogColor: "#19120d",
      fogNear: 7,
      fogFar: 36,
      lightIntensity: 1.35,
    },
  },
] as const satisfies readonly JourneyStop[];

export interface JourneyCameraTransform {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export function createJourneyCameraTransform(): JourneyCameraTransform {
  const first = ENCHANTED_GARDEN_JOURNEY[0].camera;
  return {
    position: [...first.position],
    target: [...first.target],
    fov: first.fov,
  };
}

export function clampJourneyProgress(progress: number) {
  return Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
}

export function getJourneyTargetProgress(sectionType: string) {
  const stop = ENCHANTED_GARDEN_JOURNEY.find(
    (candidate) => "section" in candidate && candidate.section === sectionType,
  );
  return stop ? (stop.range[0] + stop.range[1]) / 2 : undefined;
}

function smoothstep(value: number) {
  const t = clampJourneyProgress(value);
  return t * t * (3 - 2 * t);
}

function writeVector(
  output: [number, number, number],
  from: Vector3Tuple,
  to: Vector3Tuple,
  alpha: number,
) {
  output[0] = from[0] + (to[0] - from[0]) * alpha;
  output[1] = from[1] + (to[1] - from[1]) * alpha;
  output[2] = from[2] + (to[2] - from[2]) * alpha;
}

/** Writes into caller-owned storage so CameraRig allocates nothing per frame. */
export function writeJourneyCameraTransform(
  progress: number,
  output: JourneyCameraTransform,
) {
  const p = clampJourneyProgress(progress);
  const lastIndex = ENCHANTED_GARDEN_JOURNEY.length - 1;
  let fromIndex = lastIndex;

  for (let index = 0; index < lastIndex; index++) {
    if (p < ENCHANTED_GARDEN_JOURNEY[index + 1].range[0]) {
      fromIndex = index;
      break;
    }
  }

  const from = ENCHANTED_GARDEN_JOURNEY[fromIndex];
  const to = ENCHANTED_GARDEN_JOURNEY[Math.min(fromIndex + 1, lastIndex)];
  const span = to.range[0] - from.range[0];
  const alpha =
    from === to || span <= 0 ? 0 : smoothstep((p - from.range[0]) / span);

  writeVector(output.position, from.camera.position, to.camera.position, alpha);
  writeVector(output.target, from.camera.target, to.camera.target, alpha);
  output.fov = from.camera.fov + (to.camera.fov - from.camera.fov) * alpha;
  return output;
}
