import { useEffect, useMemo, useRef } from "react";
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
  const updateElapsedRef = useRef(0);
  const initializedRef = useRef(false);
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
      const side = random() < 0.5 ? -1 : 1;
      base[offset] = side * (2.8 + random() * 5.2);
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
      const side = random() < 0.5 ? -1 : 1;
      values[offset] = side * (2.6 + random() * 4.5);
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
  const fireflyTexture = useMemo(() => {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4;
        const dx = (x + 0.5) / size - 0.5;
        const dy = (y + 0.5) / size - 0.5;
        const alpha = Math.max(0, 1 - Math.hypot(dx, dy) * 2);
        data[offset] = 255;
        data[offset + 1] = 232;
        data[offset + 2] = 170;
        data[offset + 3] = Math.round(alpha * alpha * 255);
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => () => fireflyTexture.dispose(), [fireflyTexture]);

  useEffect(() => {
    initializedRef.current = false;
    updateElapsedRef.current = 0;
  }, [fireflyCount, petalCount, prefersReducedMotion]);

  useFrame((_, delta) => {
    if (prefersReducedMotion && initializedRef.current) return;
    if (!prefersReducedMotion) {
      animationTimeRef.current += Math.min(delta, 0.1);
      if (quality === "low") {
        updateElapsedRef.current += Math.min(delta, 0.1);
        if (updateElapsedRef.current < 1 / 30) return;
        updateElapsedRef.current %= 1 / 30;
      }
    }
    const time = animationTimeRef.current;
    const positionAttribute =
      firefliesRef.current?.geometry.attributes.position;
    if (positionAttribute) {
      const positions = positionAttribute.array as Float32Array;
      for (let index = 0; index < fireflyCount; index++) {
        const offset = index * 3;
        const phase = fireflies.phases[index];
        const speed = fireflies.speeds[index];
        const motion = prefersReducedMotion ? 0 : 1;
        positions[offset] =
          fireflies.base[offset] +
          Math.sin(time * speed + phase) * 0.18 * motion;
        positions[offset + 1] =
          fireflies.base[offset + 1] +
          Math.cos(time * speed * 1.2 + phase) * 0.12 * motion;
        positions[offset + 2] =
          fireflies.base[offset + 2] +
          Math.sin(time * speed * 0.8 + phase) * 0.14 * motion;
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
      dummy.scale.set(0.075, 0.14, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    initializedRef.current = true;
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
          map={fireflyTexture}
          alphaTest={0.025}
          size={0.14}
          color={config.color}
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <instancedMesh ref={petalsRef} args={[undefined, undefined, petalCount]}>
        <circleGeometry args={[1, 8]} />
        <meshStandardMaterial
          color="#fffdf8"
          roughness={0.6}
          side={THREE.DoubleSide}
          transparent
          opacity={0.62}
        />
      </instancedMesh>
    </group>
  );
}
