import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
  leafAccent: THREE.MeshStandardMaterial;
  flower: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
};

type SceneGeometries = {
  jasmineFlower: THREE.SphereGeometry;
  jasmineLeaf: THREE.SphereGeometry;
};

function useSceneMaterials(): SceneMaterials {
  const materials = useMemo<SceneMaterials>(
    () => ({
      stone: new THREE.MeshStandardMaterial({
        color: "#45413c",
        roughness: 0.96,
        metalness: 0.02,
      }),
      darkStone: new THREE.MeshStandardMaterial({
        color: "#2f2a26",
        roughness: 0.94,
      }),
      teak: new THREE.MeshStandardMaterial({
        color: "#493322",
        roughness: 0.66,
        metalness: 0.04,
      }),
      gebyok: new THREE.MeshStandardMaterial({
        color: "#60402a",
        roughness: 0.62,
        metalness: 0.04,
      }),
      roof: new THREE.MeshStandardMaterial({
        color: "#542718",
        roughness: 0.9,
        metalness: 0.02,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: "#a58d59",
        roughness: 0.68,
        metalness: 0.38,
      }),
      ivory: new THREE.MeshStandardMaterial({
        color: "#f1dfb9",
        roughness: 0.82,
        metalness: 0.01,
      }),
      velvet: new THREE.MeshStandardMaterial({
        color: "#ece0c5",
        roughness: 0.88,
      }),
      leaf: new THREE.MeshStandardMaterial({
        color: "#29462f",
        roughness: 0.86,
      }),
      leafAccent: new THREE.MeshStandardMaterial({
        color: "#3c6141",
        roughness: 0.84,
      }),
      flower: new THREE.MeshStandardMaterial({
        color: "#fff0cf",
        roughness: 0.78,
      }),
      glow: new THREE.MeshBasicMaterial({ color: "#ffe2af" }),
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

function useSceneGeometries(): SceneGeometries {
  const geometries = useMemo<SceneGeometries>(
    () => ({
      jasmineFlower: new THREE.SphereGeometry(1, 8, 6),
      jasmineLeaf: new THREE.SphereGeometry(1, 7, 5),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const geometry of Object.values(geometries)) geometry.dispose();
    },
    [geometries],
  );

  return geometries;
}

function PortalWing({
  side,
  materials,
}: {
  side: -1 | 1;
  materials: SceneMaterials;
}) {
  return (
    <group position={[side * 2.15, 0, 0]} rotation={[0, 0, side * -0.035]}>
      <mesh position={[0, 0.28, 0]} material={materials.darkStone}>
        <boxGeometry args={[2.25, 0.56, 1.9]} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={materials.stone}>
        <boxGeometry args={[1.92, 0.3, 1.62]} />
      </mesh>
      <mesh position={[0, 0.92, 0]} material={materials.gold}>
        <boxGeometry args={[1.96, 0.08, 1.66]} />
      </mesh>
      <mesh position={[0, 1.65, 0]} material={materials.stone}>
        <boxGeometry args={[1.66, 1.4, 1.42]} />
      </mesh>
      <mesh position={[0, 2.38, 0]} material={materials.darkStone}>
        <boxGeometry args={[1.82, 0.18, 1.54]} />
      </mesh>
      <mesh position={[0, 2.52, 0]} material={materials.gold}>
        <boxGeometry args={[1.72, 0.07, 1.44]} />
      </mesh>
      <mesh position={[side * 0.06, 3.02, 0]} material={materials.stone}>
        <boxGeometry args={[1.38, 0.92, 1.22]} />
      </mesh>
      <mesh position={[side * 0.12, 3.58, 0]} material={materials.darkStone}>
        <boxGeometry args={[1.16, 0.18, 1.05]} />
      </mesh>
      <mesh position={[side * 0.2, 4.02, 0]} material={materials.stone}>
        <boxGeometry args={[0.94, 0.7, 0.9]} />
      </mesh>
      <mesh position={[side * 0.3, 4.48, 0]} material={materials.darkStone}>
        <boxGeometry args={[0.7, 0.26, 0.72]} />
      </mesh>
      <mesh position={[side * 0.34, 4.74, 0]} material={materials.stone}>
        <boxGeometry args={[0.42, 0.3, 0.48]} />
      </mesh>
      {[1.25, 1.72, 2.96].map((y) => (
        <mesh
          key={y}
          position={[-side * 0.84, y, 0.72]}
          rotation={[Math.PI / 2, 0, 0]}
          material={materials.darkStone}
        >
          <torusGeometry args={[0.19, 0.055, 6, 16]} />
        </mesh>
      ))}
      <group position={[-side * 1.02, 2.05, 0.82]}>
        <mesh material={materials.gold}>
          <cylinderGeometry args={[0.13, 0.09, 0.42, 8]} />
        </mesh>
        <mesh material={materials.glow} position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.11, 10, 10]} />
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
      <mesh position={[0, 0.16, 0]} material={materials.darkStone}>
        <boxGeometry args={[11.2, 0.32, 10.2]} />
      </mesh>
      <mesh position={[0, 0.36, 0]} material={materials.teak}>
        <boxGeometry args={[10.5, 0.12, 9.5]} />
      </mesh>
      {[-2.4, 2.4].flatMap((x) =>
        [-2.4, 2.4].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.52, 0]} material={materials.stone}>
              <cylinderGeometry args={[0.34, 0.48, 0.62, 8]} />
            </mesh>
            <mesh position={[0, 2.5, 0]} material={materials.teak}>
              <cylinderGeometry args={[0.24, 0.28, 3.85, 16]} />
            </mesh>
            <mesh position={[0, 4.35, 0]} material={materials.gold}>
              <cylinderGeometry args={[0.34, 0.3, 0.18, 12]} />
            </mesh>
          </group>
        )),
      )}
      {[-4.8, 4.8].flatMap((x) =>
        [-4.2, 0, 4.2].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.45, 0]} material={materials.stone}>
              <cylinderGeometry args={[0.22, 0.32, 0.4, 8]} />
            </mesh>
            <mesh position={[0, 2, 0]} material={materials.teak}>
              <cylinderGeometry args={[0.16, 0.2, 3.05, 12]} />
            </mesh>
            <mesh position={[0, 3.48, 0]} material={materials.gold}>
              <boxGeometry args={[0.42, 0.16, 0.42]} />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, 4.05, 0]} material={materials.teak}>
        <boxGeometry args={[10.4, 0.2, 0.28]} />
      </mesh>
      <mesh
        position={[0, 4.05, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.teak}
      >
        <boxGeometry args={[9.4, 0.2, 0.28]} />
      </mesh>
      <group position={[0, 4.15, 0]}>
        {[5.4, 4.4, 3.45, 2.55].map((size, index) => (
          <mesh
            key={size}
            position={[0, index * 0.24, 0]}
            material={index % 2 ? materials.gold : materials.teak}
          >
            <boxGeometry args={[size, 0.14, size]} />
          </mesh>
        ))}
        <mesh position={[0, 0.85, 0]} material={materials.roof}>
          <coneGeometry args={[6.7, 1.45, 4]} />
        </mesh>
        <mesh position={[0, 1.75, 0]} material={materials.roof}>
          <coneGeometry args={[4.65, 1.55, 4]} />
        </mesh>
        <mesh position={[0, 2.68, 0]} material={materials.roof}>
          <coneGeometry args={[2.65, 1.6, 4]} />
        </mesh>
        <mesh position={[0, 3.55, 0]} material={materials.gold}>
          <coneGeometry args={[0.16, 0.72, 8]} />
        </mesh>
        <group position={[0, -0.4, 0]}>
          <mesh material={materials.gold}>
            <cylinderGeometry args={[0.025, 0.025, 0.9]} />
          </mesh>
          <mesh position={[0, -0.48, 0]} material={materials.gold}>
            <torusGeometry args={[0.34, 0.045, 8, 20]} />
          </mesh>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = (index / 6) * Math.PI * 2;
            return (
              <mesh
                key={index}
                position={[Math.cos(angle) * 0.4, -0.42, Math.sin(angle) * 0.4]}
                material={materials.glow}
              >
                <sphereGeometry args={[0.065, 8, 8]} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function CarvedPanel({
  x,
  materials,
}: {
  x: number;
  materials: SceneMaterials;
}) {
  return (
    <group position={[x, 0, 0.18]}>
      <mesh material={materials.gebyok}>
        <boxGeometry args={[1.32, 3.35, 0.13]} />
      </mesh>
      <mesh position={[0, 0, 0.08]} material={materials.gold}>
        <boxGeometry args={[1.08, 0.045, 0.04]} />
      </mesh>
      {[-1.35, 1.35].map((y) => (
        <mesh key={y} position={[0, y, 0.08]} material={materials.teak}>
          <boxGeometry args={[1.18, 0.1, 0.05]} />
        </mesh>
      ))}
      <mesh
        position={[0, 0, 0.1]}
        rotation={[0, 0, Math.PI / 4]}
        material={materials.gold}
      >
        <boxGeometry args={[0.52, 0.52, 0.045]} />
      </mesh>
      <mesh
        position={[0, 0, 0.13]}
        rotation={[0, 0, Math.PI / 4]}
        material={materials.gebyok}
      >
        <boxGeometry args={[0.34, 0.34, 0.04]} />
      </mesh>
    </group>
  );
}

type JasminePlacement = {
  position: [number, number, number];
  scale: number;
};

const JASMINE_BLOSSOMS = [
  [0, 0, 0],
  [0.23, 0.08, 0.03],
  [-0.22, 0.1, 0.02],
  [0.12, 0.27, 0],
  [-0.11, 0.3, 0.04],
  [0.32, 0.3, -0.01],
  [-0.31, 0.3, 0.02],
] as const;

function InstancedJasmine({
  placements,
  materials,
  geometries,
}: {
  placements: JasminePlacement[];
  materials: SceneMaterials;
  geometries: SceneGeometries;
}) {
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const leftLeafRef = useRef<THREE.InstancedMesh>(null);
  const rightLeafRef = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const createMatrix = (
      cluster: JasminePlacement,
      offset: readonly [number, number, number],
      size: number,
      rotationZ = 0,
    ) => {
      const { position, scale } = cluster;
      dummy.position.set(
        position[0] + offset[0] * scale,
        position[1] + offset[1] * scale,
        position[2] + offset[2] * scale,
      );
      dummy.rotation.set(0, 0, rotationZ);
      dummy.scale.setScalar(size * scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    };

    return {
      flowers: placements.flatMap((cluster) =>
        JASMINE_BLOSSOMS.map((offset) => createMatrix(cluster, offset, 0.15)),
      ),
      leftLeaves: placements.map((cluster) =>
        createMatrix(cluster, [-0.25, -0.06, -0.04], 0.24, -0.55),
      ),
      rightLeaves: placements.map((cluster) =>
        createMatrix(cluster, [0.25, -0.04, -0.05], 0.24, 0.55),
      ),
    };
  }, [placements]);

  useLayoutEffect(() => {
    const writeMatrices = (
      mesh: THREE.InstancedMesh | null,
      values: THREE.Matrix4[],
    ) => {
      if (!mesh) return;
      values.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    writeMatrices(flowerRef.current, matrices.flowers);
    writeMatrices(leftLeafRef.current, matrices.leftLeaves);
    writeMatrices(rightLeafRef.current, matrices.rightLeaves);
  }, [matrices]);

  return (
    <group name="instanced-jasmine">
      <instancedMesh
        ref={flowerRef}
        args={[
          geometries.jasmineFlower,
          materials.flower,
          matrices.flowers.length,
        ]}
      />
      <instancedMesh
        ref={leftLeafRef}
        args={[
          geometries.jasmineLeaf,
          materials.leafAccent,
          matrices.leftLeaves.length,
        ]}
      />
      <instancedMesh
        ref={rightLeafRef}
        args={[
          geometries.jasmineLeaf,
          materials.leaf,
          matrices.rightLeaves.length,
        ]}
      />
    </group>
  );
}

function Throne({ x, materials }: { x: number; materials: SceneMaterials }) {
  return (
    <group position={[x, 0.55, 0]}>
      <mesh position={[0, 0.35, 0]} material={materials.gebyok}>
        <boxGeometry args={[1.15, 0.18, 1]} />
      </mesh>
      <mesh position={[0, 0.48, 0]} material={materials.velvet}>
        <boxGeometry args={[1, 0.12, 0.84]} />
      </mesh>
      <mesh position={[0, 1.35, -0.43]} material={materials.gebyok}>
        <boxGeometry args={[1.08, 1.72, 0.18]} />
      </mesh>
      <mesh position={[0, 1.35, -0.32]} material={materials.velvet}>
        <boxGeometry args={[0.82, 1.4, 0.08]} />
      </mesh>
      <mesh position={[0, 2.25, -0.43]} material={materials.gold}>
        <coneGeometry args={[0.3, 0.48, 4]} />
      </mesh>
    </group>
  );
}

const PELAMINAN_JASMINE: JasminePlacement[] = [
  ...[-3.7, -2.45, -1.22, 0, 1.22, 2.45, 3.7].map((x) => ({
    position: [x, 3.33, -1.61] as [number, number, number],
    scale: 0.42,
  })),
  { position: [-3.7, 4.1, -1.53], scale: 1.25 },
  { position: [3.7, 4.1, -1.53], scale: 1.25 },
  { position: [-2.7, 4.7, -1.53], scale: 0.95 },
  { position: [2.7, 4.7, -1.53], scale: 0.95 },
  { position: [-3.8, 1.06, 0.85], scale: 1.08 },
  { position: [3.8, 1.06, 0.85], scale: 1.08 },
];

function ProceduralPelaminan({
  materials,
  geometries,
}: {
  materials: SceneMaterials;
  geometries: SceneGeometries;
}) {
  return (
    <group position={[0, 0, -22.5]} name="slot-pelaminan-glb">
      <mesh position={[0, 0.18, 0]} material={materials.darkStone}>
        <boxGeometry args={[10.8, 0.36, 6.2]} />
      </mesh>
      <mesh position={[0, 0.42, -0.2]} material={materials.teak}>
        <boxGeometry args={[10.1, 0.14, 5.55]} />
      </mesh>
      <mesh position={[0, 0.53, 2.28]} material={materials.gold}>
        <boxGeometry args={[9.8, 0.055, 0.12]} />
      </mesh>
      <mesh position={[0, 0.13, 3.12]} material={materials.darkStone}>
        <boxGeometry args={[5.2, 0.26, 0.95]} />
      </mesh>

      <group position={[0, 2.65, -1.95]}>
        <mesh material={materials.teak}>
          <boxGeometry args={[9.6, 4.8, 0.3]} />
        </mesh>
        <mesh position={[0, 0, 0.17]} material={materials.gebyok}>
          <boxGeometry args={[8.95, 4.25, 0.12]} />
        </mesh>
        {[-3.1, -1.55, 0, 1.55, 3.1].map((x) => (
          <CarvedPanel key={x} x={x} materials={materials} />
        ))}
        <mesh position={[0, 2.18, 0.2]} material={materials.teak}>
          <boxGeometry args={[9.65, 0.3, 0.16]} />
        </mesh>
        <mesh position={[0, 2.55, 0.16]} material={materials.roof}>
          <coneGeometry args={[5.35, 1.05, 4]} />
        </mesh>
        <mesh position={[0, 3.12, 0.16]} material={materials.gold}>
          <coneGeometry args={[0.13, 0.65, 8]} />
        </mesh>
        {[-3.7, -2.45, -1.22, 0, 1.22, 2.45, 3.7].map((x) => (
          <group key={x} position={[x, 1.7, 0.34]}>
            <mesh material={materials.ivory}>
              <cylinderGeometry args={[0.025, 0.025, 1.9, 6]} />
            </mesh>
          </group>
        ))}
      </group>

      <Throne x={-0.8} materials={materials} />
      <Throne x={0.8} materials={materials} />
      {[-3.8, 3.8].map((x) => (
        <group key={x} position={[x, 0.52, 0.85]}>
          <mesh material={materials.gebyok}>
            <cylinderGeometry args={[0.38, 0.28, 0.95, 10]} />
          </mesh>
        </group>
      ))}
      <InstancedJasmine
        placements={PELAMINAN_JASMINE}
        materials={materials}
        geometries={geometries}
      />
      <RoyalParasol position={[-4.65, 0.48, -0.45]} materials={materials} />
      <RoyalParasol position={[4.65, 0.48, -0.45]} materials={materials} />
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

const SHRUB_POSITIONS = [13, 5, -7, -16].flatMap((z) =>
  [-5.35, 5.35].map((x) => [x, 0.45, z] as [number, number, number]),
);

const FOLIAGE_JASMINE: JasminePlacement[] = [
  // Continue the same floral language from the gate to the Pendopo, using
  // the existing instanced meshes rather than another set of draw calls.
  ...[-2.2, 2.2].flatMap((x) => [
    { position: [x, 2.55, 20.85] as [number, number, number], scale: 0.85 },
    { position: [x, 1.9, 20.85] as [number, number, number], scale: 0.45 },
  ]),
  ...[-3.2, 3.2].map((x) => ({
    position: [x, 3.5, 2.2] as [number, number, number],
    scale: 0.9,
  })),
  ...TREE_POSITIONS.map(([x, y, z]) => ({
    position: [x + (x < 0 ? 0.72 : -0.72), y + 3.35, z + 1.1] as [
      number,
      number,
      number,
    ],
    scale: 0.55,
  })),
  ...SHRUB_POSITIONS.map(([x, y, z]) => ({
    position: [x, y + 0.62, z + 0.48] as [number, number, number],
    scale: 0.46,
  })),
];

function ProceduralFoliageA({
  materials,
  geometries,
}: {
  materials: SceneMaterials;
  geometries: SceneGeometries;
}) {
  return (
    <group name="slot-foliage-a-glb">
      {TREE_POSITIONS.map((position, index) => (
        <group key={index} position={position}>
          <mesh position={[0, 1.8, 0]} material={materials.teak}>
            <cylinderGeometry args={[0.16, 0.28, 3.6, 7]} />
          </mesh>
          <mesh position={[0, 3.45, 0]} material={materials.leaf}>
            <sphereGeometry args={[1.45, 9, 7]} />
          </mesh>
          <mesh position={[0.55, 4.15, 0.25]} material={materials.leafAccent}>
            <sphereGeometry args={[1.05, 8, 6]} />
          </mesh>
          <mesh position={[-0.7, 3.92, 0.18]} material={materials.leaf}>
            <sphereGeometry args={[0.9, 8, 6]} />
          </mesh>
        </group>
      ))}
      {SHRUB_POSITIONS.map(([x, y, z]) => (
        <group key={`${x}-${z}`} position={[x, y, z]}>
          <mesh position={[0, 0.25, 0]} material={materials.leaf}>
            <sphereGeometry args={[0.85, 8, 6]} />
          </mesh>
          <mesh
            position={[x < 0 ? 0.52 : -0.52, 0.42, 0.16]}
            material={materials.leafAccent}
          >
            <sphereGeometry args={[0.62, 8, 6]} />
          </mesh>
        </group>
      ))}
      <InstancedJasmine
        placements={FOLIAGE_JASMINE}
        materials={materials}
        geometries={geometries}
      />
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
              <sphereGeometry args={[0.1, 8, 8]} />
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
  const geometries = useSceneGeometries();
  return (
    <group name="sekar-jawa-3d-architecture">
      <ProceduralPortal materials={materials} />
      <ProceduralPendopo materials={materials} />
      <ProceduralPelaminan materials={materials} geometries={geometries} />
      <ProceduralFoliageA materials={materials} geometries={geometries} />
      <ProceduralFoliageB materials={materials} />
    </group>
  );
}
