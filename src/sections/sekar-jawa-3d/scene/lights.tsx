import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { SEKAR_JAWA_3D_MANIFEST } from "../manifest";
import type { SceneQuality } from "../types";
import type { ProgressRef } from "../progress";

export function Lights({
  quality,
  prefersReducedMotion,
  progressRef,
}: {
  quality: SceneQuality;
  prefersReducedMotion: boolean;
  progressRef: ProgressRef;
}) {
  const entranceLeft = useRef<THREE.PointLight>(null);
  const entranceRight = useRef<THREE.PointLight>(null);
  const pendopo = useRef<THREE.PointLight>(null);
  const pelaminan = useRef<THREE.PointLight>(null);
  const pelaminanSpot = useRef<THREE.SpotLight>(null);
  const pelaminanTarget = useRef<THREE.Object3D>(null);
  const updateElapsedRef = useRef(0);
  const previousProgress = useRef(-1);
  const config = SEKAR_JAWA_3D_MANIFEST.lightingConfig;

  useEffect(() => {
    if (pelaminanSpot.current && pelaminanTarget.current) {
      pelaminanSpot.current.target = pelaminanTarget.current;
    }
  }, [quality]);

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current;
    if (
      prefersReducedMotion &&
      Math.abs(previousProgress.current - progress) < 0.001
    )
      return;
    if (!prefersReducedMotion && quality !== "high") {
      updateElapsedRef.current += Math.min(delta, 0.1);
      const interval = quality === "low" ? 1 / 20 : 1 / 30;
      if (updateElapsedRef.current < interval) return;
      updateElapsedRef.current %= interval;
    }
    const time = clock.getElapsedTime() * config.flickerSpeed;
    const flickerA = prefersReducedMotion
      ? 0
      : Math.sin(time * 1.3) * 0.035 + Math.cos(time * 2.7) * 0.02;
    const flickerB = prefersReducedMotion
      ? 0
      : Math.sin(time * 1.7 + 1.2) * 0.035 + Math.cos(time * 3.1) * 0.02;
    const base = config.lanternIntensity;
    const arrival = Math.max(0, Math.min(1, (progress - 0.84) / 0.14));
    const ceremony = arrival * arrival * (3 - 2 * arrival);

    if (entranceLeft.current)
      entranceLeft.current.intensity = base * (1 + flickerA);
    if (entranceRight.current)
      entranceRight.current.intensity = base * (1 + flickerB);
    if (pendopo.current)
      pendopo.current.intensity = base * 0.95 * (1 + flickerA * 0.55);
    if (pelaminan.current)
      pelaminan.current.intensity =
        base * (1.2 + ceremony * 1.15) * (1 + flickerB * 0.45);
    if (pelaminanSpot.current)
      pelaminanSpot.current.intensity = 3.5 + ceremony * 3;
    previousProgress.current = progress;
  });

  return (
    <group name="sekar-jawa-3d-lighting">
      <ambientLight
        color={config.ambientColor}
        intensity={config.ambientIntensity}
      />
      <directionalLight
        color={config.moonlightColor}
        intensity={config.moonlightIntensity}
        position={[10, 24, 14]}
        castShadow={false}
      />
      {quality !== "low" ? (
        <directionalLight
          color="#d9c6a0"
          intensity={0.85}
          position={[-9, 16, 8]}
        />
      ) : null}
      <pointLight
        ref={entranceLeft}
        color={config.lanternColor}
        intensity={config.lanternIntensity}
        distance={20}
        decay={2}
        position={[-2.8, 2.6, 21]}
      />
      <pointLight
        ref={entranceRight}
        color={config.lanternColor}
        intensity={config.lanternIntensity}
        distance={20}
        decay={2}
        position={[2.8, 2.6, 21]}
      />
      <pointLight
        ref={pendopo}
        color="#f4d5a3"
        intensity={config.lanternIntensity}
        distance={24}
        decay={2}
        position={[0, 4.2, 0]}
      />
      <pointLight
        ref={pelaminan}
        color="#ffe1ad"
        intensity={5}
        distance={27}
        decay={2}
        position={[0, 3.4, -20.5]}
      />
      {quality === "high" ? (
        <spotLight
          ref={pelaminanSpot}
          color="#f6dfaa"
          intensity={4.2}
          angle={0.58}
          penumbra={0.72}
          distance={22}
          decay={1.8}
          position={[0, 8.5, -16.5]}
        />
      ) : null}
      <object3D ref={pelaminanTarget} position={[0, 2.1, -22.5]} />
    </group>
  );
}
