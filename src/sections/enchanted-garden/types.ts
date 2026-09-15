export type SceneQuality = "high" | "medium" | "low";

export type Vector3Tuple = readonly [number, number, number];

export interface JourneyStop {
  id: string;
  range: readonly [number, number];
  camera: {
    position: Vector3Tuple;
    target: Vector3Tuple;
    fov: number;
  };
  section?: string;
  atmosphere?: {
    fogColor: string;
    fogNear: number;
    fogFar: number;
    lightIntensity: number;
  };
}

export interface SceneManifest {
  models: Record<
    "portal" | "pendopo" | "pelaminan" | "foliageA" | "foliageB",
    {
      file: string;
      status: "procedural" | "optional-glb";
      proceduralComponent: string;
    }
  >;
  particleConfig: {
    fireflies: Record<SceneQuality, number>;
    petals: Record<SceneQuality, number>;
    color: string;
  };
  lightingConfig: {
    ambientColor: string;
    ambientIntensity: number;
    lanternColor: string;
    lanternIntensity: number;
    flickerSpeed: number;
    moonlightColor: string;
    moonlightIntensity: number;
  };
  fogConfig: {
    color: string;
    near: number;
    far: number;
  };
}
