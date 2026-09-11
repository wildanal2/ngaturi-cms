import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

export function Environment({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean;
}) {
  const mistRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!mistRef.current) return;
    mistRef.current.position.x = prefersReducedMotion
      ? 0
      : Math.sin(clock.getElapsedTime() * 0.15) * 0.8;
  });

  return (
    <group name="enchanted-garden-environment">
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 80]} />
        <meshStandardMaterial color="#0e0a07" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.2, 70]} />
        <meshStandardMaterial color="#1e1712" roughness={0.7} metalness={0.15} />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 70]} />
          <meshStandardMaterial color="#6e4426" roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 0.01, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 32]} />
          <meshStandardMaterial color="#090e11" roughness={0.15} metalness={0.8} />
        </mesh>
      ))}
      <mesh
        ref={mistRef}
        position={[0, 0.35, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[36, 68]} />
        <meshBasicMaterial
          color="#faf6ee"
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
