import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { SceneQuality } from "../types";

function MistSurface({ mistRef }: { mistRef?: RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={mistRef} position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[36, 68]} />
      <meshBasicMaterial
        color="#faf6ee"
        transparent
        opacity={0.045}
        depthWrite={false}
      />
    </mesh>
  );
}

function AnimatedMist() {
  const mistRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!mistRef.current) return;
    mistRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.15) * 0.8;
  });

  return <MistSurface mistRef={mistRef} />;
}

export function Environment({
  quality,
  prefersReducedMotion,
}: {
  quality: SceneQuality;
  prefersReducedMotion: boolean;
}) {
  return (
    <group name="sekar-jawa-3d-environment">
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 80]} />
        <meshStandardMaterial
          color="#222a1d"
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[4.2, 70]} />
        <meshStandardMaterial
          color="#49463b"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 70]} />
          <meshStandardMaterial
            color="#8f815d"
            roughness={0.64}
            metalness={0.04}
          />
        </mesh>
      ))}
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 0.01, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 32]} />
          <meshStandardMaterial
            color="#132126"
            roughness={0.2}
            metalness={0.25}
          />
        </mesh>
      ))}
      {quality !== "low" ? (
        prefersReducedMotion ? (
          <MistSurface />
        ) : (
          <AnimatedMist />
        )
      ) : null}
    </group>
  );
}
