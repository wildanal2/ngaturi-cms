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
    fireflies: { high: 65, medium: 42, low: 24 },
    petals: { high: 35, medium: 22, low: 10 },
    color: "#f3e5ab",
  },
  lightingConfig: {
    ambientColor: "#2b1e17",
    ambientIntensity: 1.4,
    lanternColor: "#ffaa3c",
    lanternIntensity: 3.2,
    flickerSpeed: 4.5,
    moonlightColor: "#7a8c9e",
    moonlightIntensity: 0.65,
  },
  fogConfig: {
    color: "#130e0b",
    near: 8,
    far: 48,
  },
};
