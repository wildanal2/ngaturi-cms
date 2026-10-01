"use client";

import { memo, Suspense } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { SEKAR_JAWA_3D_MANIFEST } from "../manifest";
import type { ProgressRef } from "../progress";
import { getSekarJawa3DDpr } from "../quality";
import type { SceneQuality } from "../types";
import styles from "../sekar-jawa-3d.module.css";
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

export const SekarJawa3DScene = memo(function SekarJawa3DScene({
  progressRef,
  quality,
  prefersReducedMotion,
}: {
  progressRef: ProgressRef;
  quality: SceneQuality;
  prefersReducedMotion: boolean;
}) {
  const fog = SEKAR_JAWA_3D_MANIFEST.fogConfig;

  return (
    <div
      className={styles.canvas}
      data-sekar-jawa-3d-canvas
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 3.2, 28], fov: 48, near: 0.1, far: 120 }}
        dpr={getSekarJawa3DDpr(quality)}
        gl={{
          alpha: false,
          antialias: quality !== "low",
          powerPreference: "high-performance",
        }}
        onCreated={configureRenderer}
        fallback={
          <div
            className={styles.fallback}
            data-sekar-jawa-3d-webgl-fallback
          />
        }
      >
        <color attach="background" args={["#120d0a"]} />
        <fog attach="fog" args={[fog.color, fog.near, fog.far]} />
        <Suspense fallback={null}>
          <Lights
            progressRef={progressRef}
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
