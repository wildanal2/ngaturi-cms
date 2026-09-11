import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ENCHANTED_GARDEN_MANIFEST } from "../manifest";
import type { SceneQuality } from "../types";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function Particles({
  quality,
  prefersReducedMotion,
}: {
  quality: SceneQuality;
  prefersReducedMotion: boolean;
}) {
  const firefliesRef = useRef<THREE.Points>(null);
  const petalsRef = useRef<THREE.InstancedMesh>(null);
  const animationTimeRef = useRef(0);
  const config = ENCHANTED_GARDEN_MANIFEST.particleConfig;
  const fireflyCount = config.fireflies[quality];
  const petalCount = config.petals[quality];

  const fireflies = useMemo(() => {
    const random = seededRandom(0x6e676172);
    const base = new Float32Array(fireflyCount * 3);
    const positions = new Float32Array(fireflyCount * 3);
    const phases = new Float32Array(fireflyCount);
    const speeds = new Float32Array(fireflyCount);
    for (let index = 0; index < fireflyCount; index++) {
      const offset = index * 3;
      base[offset] = (random() - 0.5) * 16;
      base[offset + 1] = 0.6 + random() * 5.5;
      base[offset + 2] = -28 + random() * 60;
      positions[offset] = base[offset];
      positions[offset + 1] = base[offset + 1];
      positions[offset + 2] = base[offset + 2];
      phases[index] = random() * Math.PI * 2;
      speeds[index] = 0.2 + random() * 0.4;
    }
    return { base, positions, phases, speeds };
  }, [fireflyCount]);

  const petals = useMemo(() => {
    const random = seededRandom(0x70657461);
    const values = new Float32Array(petalCount * 8);
    for (let index = 0; index < petalCount; index++) {
      const offset = index * 8;
      values[offset] = (random() - 0.5) * 14;
      values[offset + 1] = 1 + random() * 8;
      values[offset + 2] = -26 + random() * 56;
      values[offset + 3] = random() * Math.PI;
      values[offset + 4] = random() * Math.PI;
      values[offset + 5] = random() * Math.PI;
      values[offset + 6] = 0.45 + random() * 0.55;
      values[offset + 7] = (random() - 0.5) * 0.9;
    }
    return values;
  }, [petalCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!prefersReducedMotion) {
      animationTimeRef.current += Math.min(delta, 0.1);
    }
    const time = animationTimeRef.current;
    const positionAttribute = firefliesRef.current?.geometry.attributes.position;
    if (positionAttribute) {
      const positions = positionAttribute.array as Float32Array;
      for (let index = 0; index < fireflyCount; index++) {
        const offset = index * 3;
        const phase = fireflies.phases[index];
        const speed = fireflies.speeds[index];
        const motion = prefersReducedMotion ? 0 : 1;
        positions[offset] =
          fireflies.base[offset] + Math.sin(time * speed + phase) * 0.18 * motion;
        positions[offset + 1] =
          fireflies.base[offset + 1] + Math.cos(time * speed * 1.2 + phase) * 0.12 * motion;
        positions[offset + 2] =
          fireflies.base[offset + 2] + Math.sin(time * speed * 0.8 + phase) * 0.14 * motion;
      }
      positionAttribute.needsUpdate = true;
    }

    const mesh = petalsRef.current;
    if (!mesh) return;
    for (let index = 0; index < petalCount; index++) {
      const offset = index * 8;
      const phase = petals[offset + 5];
      const speed = petals[offset + 6];
      const spin = petals[offset + 7];
      const cycle = 10;
      const fallen = (time * speed) % cycle;
      const y = prefersReducedMotion
        ? petals[offset + 1]
        : 0.1 + ((petals[offset + 1] - fallen + cycle) % cycle);
      const x =
        petals[offset] +
        (prefersReducedMotion ? 0 : Math.sin(time * 0.8 + phase) * 0.3);
      dummy.position.set(x, y, petals[offset + 2]);
      dummy.rotation.set(
        petals[offset + 3] + time * spin,
        petals[offset + 4],
        phase + time * spin * 0.8,
      );
      dummy.scale.set(0.08, 0.02, 0.12);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="enchanted-garden-particles">
      <points ref={firefliesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[fireflies.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          color={config.color}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <instancedMesh ref={petalsRef} args={[undefined, undefined, petalCount]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#fffdf8"
          roughness={0.6}
          side={THREE.DoubleSide}
          transparent
          opacity={0.75}
        />
      </instancedMesh>
    </group>
  );
}
