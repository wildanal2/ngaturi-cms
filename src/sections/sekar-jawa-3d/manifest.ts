import type { SceneManifest } from "./types";

/** Procedural V1 is complete; these filenames are optional future replacements. */
export const SEKAR_JAWA_3D_MANIFEST: SceneManifest = {
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
    ambientColor: "#b7ad94",
    ambientIntensity: 1.3,
    lanternColor: "#f6d5a1",
    lanternIntensity: 3.4,
    flickerSpeed: 0.7,
    moonlightColor: "#c5cabb",
    moonlightIntensity: 1.2,
  },
  fogConfig: {
    color: "#17120f",
    near: 11,
    far: 56,
  },
};
