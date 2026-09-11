import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { ENCHANTED_GARDEN_MANIFEST } from "../manifest";

export function Lights({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean;
}) {
  const entranceLeft = useRef<THREE.PointLight>(null);
  const entranceRight = useRef<THREE.PointLight>(null);
  const pendopo = useRef<THREE.PointLight>(null);
  const pelaminan = useRef<THREE.PointLight>(null);
  const config = ENCHANTED_GARDEN_MANIFEST.lightingConfig;

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() * config.flickerSpeed;
    const flickerA = prefersReducedMotion
      ? 0
      : Math.sin(time * 1.3) * 0.15 + Math.cos(time * 2.7) * 0.1;
    const flickerB = prefersReducedMotion
      ? 0
      : Math.sin(time * 1.7 + 1.2) * 0.15 + Math.cos(time * 3.1) * 0.1;
    const base = config.lanternIntensity;

    if (entranceLeft.current) entranceLeft.current.intensity = base * (1 + flickerA);
    if (entranceRight.current) entranceRight.current.intensity = base * (1 + flickerB);
    if (pendopo.current) pendopo.current.intensity = base * 0.9 * (1 + flickerA * 0.8);
    if (pelaminan.current) pelaminan.current.intensity = base * 1.1 * (1 + flickerB * 0.8);
  });

  return (
    <group name="enchanted-garden-lighting">
      <ambientLight color={config.ambientColor} intensity={config.ambientIntensity} />
      <directionalLight
        color={config.moonlightColor}
        intensity={config.moonlightIntensity}
        position={[12, 28, 15]}
        castShadow={false}
      />
      <directionalLight color="#f3e5ab" intensity={1.2} position={[-8, 18, 10]} />
      <pointLight
        ref={entranceLeft}
        color={config.lanternColor}
        intensity={config.lanternIntensity}
        distance={18}
        decay={2}
        position={[-2.8, 2.6, 21]}
      />
      <pointLight
        ref={entranceRight}
        color={config.lanternColor}
        intensity={config.lanternIntensity}
        distance={18}
        decay={2}
        position={[2.8, 2.6, 21]}
      />
      <pointLight
        ref={pendopo}
        color="#ffb347"
        intensity={config.lanternIntensity}
        distance={22}
        decay={2}
        position={[0, 4.2, 0]}
      />
      <pointLight
        ref={pelaminan}
        color="#ffa834"
        intensity={3.8}
        distance={24}
        decay={2}
        position={[0, 3.2, -21]}
      />
      <spotLight
        color="#fff4d0"
        intensity={2.8}
        angle={0.65}
        penumbra={0.8}
        position={[0, 8.5, -14]}
      />
    </group>
  );
}
