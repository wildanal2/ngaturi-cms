"use client";

import { memo, Suspense } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { ENCHANTED_GARDEN_MANIFEST } from "../manifest";
import type { ProgressRef } from "../progress";
import { getEnchantedGardenDpr } from "../quality";
import type { SceneQuality } from "../types";
import styles from "../enchanted-garden.module.css";
import { CameraRig } from "./camera-rig";
import { Environment } from "./environment";
import { Lights } from "./lights";
import { Particles } from "./particles";
import { SceneController } from "./scene-controller";

function configureRenderer({ gl }: RootState) {
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
}

export const EnchantedGardenScene = memo(function EnchantedGardenScene({
  progressRef,
  quality,
  prefersReducedMotion,
}: {
  progressRef: ProgressRef;
  quality: SceneQuality;
  prefersReducedMotion: boolean;
}) {
  const fog = ENCHANTED_GARDEN_MANIFEST.fogConfig;

  return (
    <div
      className={styles.canvas}
      data-enchanted-garden-canvas
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 3.2, 28], fov: 48, near: 0.1, far: 120 }}
        dpr={getEnchantedGardenDpr(quality)}
        gl={{
          alpha: false,
          antialias: quality !== "low",
          powerPreference: "high-performance",
        }}
        onCreated={configureRenderer}
        fallback={
          <div
            className={styles.fallback}
            data-enchanted-garden-webgl-fallback
          />
        }
      >
        <color attach="background" args={["#120d0a"]} />
        <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
        <Suspense fallback={null}>
          <Lights
            quality={quality}
            prefersReducedMotion={prefersReducedMotion}
          />
          <Environment
            quality={quality}
            prefersReducedMotion={prefersReducedMotion}
          />
          <SceneController />
          <Particles
            quality={quality}
            prefersReducedMotion={prefersReducedMotion}
          />
          <CameraRig
            progressRef={progressRef}
            prefersReducedMotion={prefersReducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});
