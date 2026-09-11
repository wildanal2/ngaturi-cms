import { useEffect, useMemo } from "react";
import * as THREE from "three";

type SceneMaterials = {
  stone: THREE.MeshStandardMaterial;
  darkStone: THREE.MeshStandardMaterial;
  teak: THREE.MeshStandardMaterial;
  gebyok: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  ivory: THREE.MeshStandardMaterial;
  velvet: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  flower: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
};

function useSceneMaterials(): SceneMaterials {
  const materials = useMemo<SceneMaterials>(
    () => ({
      stone: new THREE.MeshStandardMaterial({
        color: "#241d17",
        roughness: 0.88,
        metalness: 0.12,
      }),
      darkStone: new THREE.MeshStandardMaterial({
        color: "#261e18",
        roughness: 0.85,
      }),
      teak: new THREE.MeshStandardMaterial({
        color: "#382214",
        roughness: 0.58,
        metalness: 0.1,
      }),
      gebyok: new THREE.MeshStandardMaterial({
        color: "#341e11",
        roughness: 0.54,
        metalness: 0.12,
      }),
      roof: new THREE.MeshStandardMaterial({
        color: "#4e2516",
        roughness: 0.85,
        metalness: 0.05,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: "#c89d3c",
        roughness: 0.34,
        metalness: 0.8,
      }),
      ivory: new THREE.MeshStandardMaterial({
        color: "#faf4e8",
        roughness: 0.72,
        metalness: 0.05,
      }),
      velvet: new THREE.MeshStandardMaterial({
        color: "#461318",
        roughness: 0.82,
      }),
      leaf: new THREE.MeshStandardMaterial({
        color: "#22321d",
        roughness: 0.75,
      }),
      flower: new THREE.MeshStandardMaterial({
        color: "#faf0d7",
        roughness: 0.6,
      }),
      glow: new THREE.MeshBasicMaterial({ color: "#ffb347" }),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
    },
    [materials],
  );

  return materials;
}

function PortalWing({
  side,
  materials,
}: {
  side: -1 | 1;
  materials: SceneMaterials;
}) {
  return (
    <group position={[side * 2.3, 0, 0]}>
      <mesh position={[0, 0.35, 0]} material={materials.stone}>
        <boxGeometry args={[1.8, 0.7, 1.6]} />
      </mesh>
      <mesh position={[0, 0.85, 0]} material={materials.stone}>
        <boxGeometry args={[1.5, 0.3, 1.4]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={materials.gold}>
        <boxGeometry args={[1.55, 0.12, 1.45]} />
      </mesh>
      <mesh position={[0, 1.85, 0]} material={materials.stone}>
        <boxGeometry args={[1.3, 1.5, 1.2]} />
      </mesh>
      <mesh position={[0, 2.65, 0]} material={materials.gold}>
        <boxGeometry args={[1.35, 0.1, 1.25]} />
      </mesh>
      <mesh position={[0, 3.25, 0]} material={materials.stone}>
        <boxGeometry args={[1.05, 1.1, 1]} />
      </mesh>
      <mesh position={[0, 4, 0]} material={materials.stone}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
      </mesh>
      <mesh position={[0, 4.7, 0]} material={materials.gold}>
        <coneGeometry args={[0.45, 1, 4]} />
      </mesh>
      <group position={[-side * 0.85, 2.3, 0.7]}>
        <mesh material={materials.gold}>
          <cylinderGeometry args={[0.15, 0.1, 0.45, 6]} />
        </mesh>
        <mesh material={materials.glow} position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.13, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

function RoyalParasol({
  position,
  materials,
}: {
  position: [number, number, number];
  materials: SceneMaterials;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]} material={materials.teak}>
        <cylinderGeometry args={[0.04, 0.05, 4.4, 8]} />
      </mesh>
      <mesh position={[0, 4.1, 0]} material={materials.ivory}>
        <coneGeometry args={[1.05, 0.44, 16]} />
      </mesh>
      <mesh position={[0, 3.9, 0]} material={materials.gold}>
        <cylinderGeometry args={[1.07, 1.07, 0.08, 16]} />
      </mesh>
      <mesh position={[0, 4.45, 0]} material={materials.gold}>
        <coneGeometry args={[0.08, 0.35, 8]} />
      </mesh>
    </group>
  );
}

function ProceduralPortal({ materials }: { materials: SceneMaterials }) {
  return (
    <group position={[0, 0, 20]} name="slot-portal-glb">
      <PortalWing side={-1} materials={materials} />
      <PortalWing side={1} materials={materials} />
      <RoyalParasol position={[-4.2, 0, 1.5]} materials={materials} />
      <RoyalParasol position={[4.2, 0, 1.5]} materials={materials} />
    </group>
  );
}

function ProceduralPendopo({ materials }: { materials: SceneMaterials }) {
  return (
    <group name="slot-pendopo-glb">
      {[-2.4, 2.4].flatMap((x) =>
        [-2.4, 2.4].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.28, 0]} material={materials.darkStone}>
              <cylinderGeometry args={[0.32, 0.46, 0.56, 8]} />
            </mesh>
            <mesh position={[0, 2.4, 0]} material={materials.teak}>
              <cylinderGeometry args={[0.22, 0.25, 3.8, 16]} />
            </mesh>
            <mesh position={[0, 4.2, 0]} material={materials.gold}>
              <boxGeometry args={[0.62, 0.28, 0.62]} />
            </mesh>
          </group>
        )),
      )}
      {[-4.8, 4.8].flatMap((x) =>
        [-4.2, 0, 4.2].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.2, 0]} material={materials.darkStone}>
              <cylinderGeometry args={[0.22, 0.32, 0.4, 8]} />
            </mesh>
            <mesh position={[0, 1.8, 0]} material={materials.teak}>
              <cylinderGeometry args={[0.15, 0.18, 2.8, 12]} />
            </mesh>
            <mesh position={[0, 3.2, 0]} material={materials.gold}>
              <boxGeometry args={[0.42, 0.16, 0.42]} />
            </mesh>
          </group>
        )),
      )}
      <group position={[0, 4.35, 0]}>
        {[5.6, 4.6, 3.6, 2.6].map((size, index) => (
          <group key={size} position={[0, index * 0.35, 0]}>
            <mesh position={[0, 0.15, 0]} material={materials.teak}>
              <boxGeometry args={[size, 0.22, size]} />
            </mesh>
            {index < 3 ? (
              <mesh position={[0, 0.28, 0]} material={materials.gold}>
                <boxGeometry args={[size - 0.4, 0.08, size - 0.4]} />
              </mesh>
            ) : null}
          </group>
        ))}
        <mesh position={[0, 2, 0]} material={materials.roof}>
          <coneGeometry args={[6.6, 2.2, 4]} />
        </mesh>
        <group position={[0, -0.65, 0]}>
          <mesh material={materials.gold}>
            <cylinderGeometry args={[0.025, 0.025, 1.1]} />
          </mesh>
          <mesh position={[0, -0.55, 0]} material={materials.gold}>
            <torusGeometry args={[0.65, 0.06, 8, 24]} />
          </mesh>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = (index / 6) * Math.PI * 2;
            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * 0.65,
                  -0.45,
                  Math.sin(angle) * 0.65,
                ]}
                material={materials.glow}
              >
                <sphereGeometry args={[0.08, 8, 8]} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function Throne({ x, materials }: { x: number; materials: SceneMaterials }) {
  return (
    <group position={[x, 0.45, 0]}>
      <mesh position={[0, 0.45, 0]} material={materials.gebyok}>
        <boxGeometry args={[1, 0.15, 0.9]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={materials.velvet}>
        <boxGeometry args={[0.9, 0.1, 0.8]} />
      </mesh>
      <mesh position={[0, 1.25, -0.4]} material={materials.gold}>
        <boxGeometry args={[0.95, 1.45, 0.14]} />
      </mesh>
      <mesh position={[0, 2.05, -0.4]} material={materials.gold}>
        <coneGeometry args={[0.2, 0.3, 4]} />
      </mesh>
    </group>
  );
}

function ProceduralPelaminan({ materials }: { materials: SceneMaterials }) {
  return (
    <group position={[0, 0, -22.5]} name="slot-pelaminan-glb">
      <mesh position={[0, 0.15, 0]} material={materials.gebyok}>
        <boxGeometry args={[9.4, 0.3, 5.4]} />
      </mesh>
      <mesh position={[0, 0.35, -0.2]} material={materials.gebyok}>
        <boxGeometry args={[8.8, 0.2, 4.6]} />
      </mesh>
      <mesh position={[0, 0.46, 2.05]} material={materials.gold}>
        <boxGeometry args={[8.85, 0.04, 0.1]} />
      </mesh>
      <mesh position={[0, 0.1, 2.8]} material={materials.gebyok}>
        <boxGeometry args={[4.4, 0.2, 0.8]} />
      </mesh>

      <group position={[0, 2.4, -1.8]}>
        <mesh material={materials.gebyok}>
          <boxGeometry args={[8.6, 4.2, 0.26]} />
        </mesh>
        <mesh position={[0, 2.3, 0.08]} material={materials.gold}>
          <boxGeometry args={[4.2, 0.6, 0.16]} />
        </mesh>
        <mesh position={[0, 2.7, 0.08]} material={materials.gold}>
          <coneGeometry args={[0.5, 0.5, 4]} />
        </mesh>
        {[-3, -1.5, 0, 1.5, 3].map((x) => (
          <group key={x} position={[x, 0, 0.14]}>
            <mesh material={materials.gold}>
              <boxGeometry args={[1.15, 3.1, 0.06]} />
            </mesh>
            <mesh position={[0, 0, 0.02]} material={materials.gebyok}>
              <boxGeometry args={[0.9, 2.8, 0.04]} />
            </mesh>
          </group>
        ))}
        {[-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map((x) => (
          <group key={x} position={[x, 1.8, 0.24]}>
            <mesh material={materials.ivory}>
              <cylinderGeometry args={[0.035, 0.035, 2.5, 6]} />
            </mesh>
            <mesh position={[0, -1.3, 0]} material={materials.ivory}>
              <sphereGeometry args={[0.1, 6, 6]} />
            </mesh>
          </group>
        ))}
      </group>

      <Throne x={-0.8} materials={materials} />
      <Throne x={0.8} materials={materials} />
      {[-2.8, 2.8].map((x) => (
        <group key={x} position={[x, 0.45, 0]}>
          <mesh position={[0, 0.38, 0]} material={materials.gebyok}>
            <boxGeometry args={[0.85, 0.12, 0.8]} />
          </mesh>
          <mesh position={[0, 0.46, 0]} material={materials.velvet}>
            <boxGeometry args={[0.78, 0.08, 0.72]} />
          </mesh>
          <mesh position={[0, 1.05, -0.36]} material={materials.gold}>
            <boxGeometry args={[0.8, 1.15, 0.1]} />
          </mesh>
        </group>
      ))}
      {[-3.8, 3.8].map((x) => (
        <group key={x} position={[x, 0.45, 0.9]}>
          <mesh material={materials.gold}>
            <cylinderGeometry args={[0.32, 0.22, 0.85, 10]} />
          </mesh>
          <mesh position={[0, 0.55, 0]} material={materials.flower}>
            <sphereGeometry args={[0.42, 8, 8]} />
          </mesh>
        </group>
      ))}
      <RoyalParasol position={[-4.5, 0.45, -0.5]} materials={materials} />
      <RoyalParasol position={[4.5, 0.45, -0.5]} materials={materials} />
    </group>
  );
}

const TREE_POSITIONS: [number, number, number][] = [
  [-6.8, 0, 24],
  [6.8, 0, 24],
  [-7, 0, 13],
  [7, 0, 13],
  [-7.4, 0, -6],
  [7.4, 0, -6],
  [-6.8, 0, -18],
  [6.8, 0, -18],
];

function ProceduralFoliageA({ materials }: { materials: SceneMaterials }) {
  return (
    <group name="slot-foliage-a-glb">
      {TREE_POSITIONS.map((position, index) => (
        <group key={index} position={position}>
          <mesh position={[0, 1.8, 0]} material={materials.teak}>
            <cylinderGeometry args={[0.16, 0.28, 3.6, 7]} />
          </mesh>
          <mesh position={[0, 3.6, 0]} material={materials.leaf}>
            <sphereGeometry args={[1.6, 7, 7]} />
          </mesh>
          <mesh position={[0.4, 4.3, 0.3]} material={materials.leaf}>
            <sphereGeometry args={[1.1, 6, 6]} />
          </mesh>
          <mesh position={[0.2, 3.4, 1.2]} material={materials.flower}>
            <sphereGeometry args={[0.22, 5, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ProceduralFoliageB({ materials }: { materials: SceneMaterials }) {
  return (
    <group name="slot-foliage-b-glb">
      {[26, 17, 8, -2, -10, -17].flatMap((z) =>
        [-2.8, 2.8].map((x) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.45, 0]} material={materials.stone}>
              <cylinderGeometry args={[0.22, 0.3, 0.9, 6]} />
            </mesh>
            <mesh position={[0, 1, 0]} material={materials.stone}>
              <boxGeometry args={[0.42, 0.35, 0.42]} />
            </mesh>
            <mesh position={[0, 1, 0]} material={materials.glow}>
              <sphereGeometry args={[0.13, 6, 6]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

/** One procedural scene with five independent future GLB replacement slots. */
export function SceneController() {
  const materials = useSceneMaterials();
  return (
    <group name="enchanted-javanese-architecture">
      <ProceduralPortal materials={materials} />
      <ProceduralPendopo materials={materials} />
      <ProceduralPelaminan materials={materials} />
      <ProceduralFoliageA materials={materials} />
      <ProceduralFoliageB materials={materials} />
    </group>
  );
}
