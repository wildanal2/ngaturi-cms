import type { SceneManifest } from "./types";

/** Procedural V1 is complete; these filenames are optional future replacements. */
export const ENCHANTED_GARDEN_MANIFEST: SceneManifest = {
  models: {
    portal: {
      file: "portal.glb",
      status: "procedural",
      proceduralComponent: "ProceduralPortal",
    },
    pendopo: {
      file: "pendopo.glb",
      status: "procedural",
      proceduralComponent: "ProceduralPendopo",
    },
    pelaminan: {
      file: "pelaminan.glb",
      status: "procedural",
      proceduralComponent: "ProceduralPelaminan",
    },
    foliageA: {
      file: "foliage-a.glb",
      status: "procedural",
      proceduralComponent: "ProceduralFoliageA",
    },
    foliageB: {
      file: "foliage-b.glb",
      status: "procedural",
      proceduralComponent: "ProceduralFoliageB",
    },
  },
  particleConfig: {
    fireflies: { high: 54, medium: 36, low: 20 },
    petals: { high: 28, medium: 18, low: 8 },
    color: "#f0c978",
  },
  lightingConfig: {
    ambientColor: "#584538",
    ambientIntensity: 1.15,
    lanternColor: "#ffbd69",
    lanternIntensity: 3.4,
    flickerSpeed: 3.4,
    moonlightColor: "#9aaec2",
    moonlightIntensity: 1.05,
  },
  fogConfig: {
    color: "#17120f",
    near: 11,
    far: 56,
  },
};
