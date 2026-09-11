import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createJourneyCameraTransform,
  writeJourneyCameraTransform,
} from "../journey";
import type { ProgressRef } from "../progress";

export function CameraRig({
  progressRef,
  prefersReducedMotion,
}: {
  progressRef: ProgressRef;
  prefersReducedMotion: boolean;
}) {
  const { camera, pointer } = useThree();
  const transformRef = useRef(createJourneyCameraTransform());
  const currentLookAtRef = useRef<THREE.Vector3 | null>(null);
  const destinationRef = useRef<THREE.Vector3 | null>(null);

  currentLookAtRef.current ??= new THREE.Vector3(0, 2.5, 12);
  destinationRef.current ??= new THREE.Vector3(0, 2.5, 12);

  useFrame((_, delta) => {
    const transform = writeJourneyCameraTransform(
      progressRef.current,
      transformRef.current,
    );
    const parallaxX = prefersReducedMotion ? 0 : pointer.x * 0.35;
    const parallaxY = prefersReducedMotion ? 0 : pointer.y * 0.18;
    const destination = destinationRef.current!;
    const currentLookAt = currentLookAtRef.current!;

    const destinationX = transform.position[0] + parallaxX;
    const destinationY = transform.position[1] + parallaxY;
    const destinationZ = transform.position[2];
    destination.set(
      transform.target[0] + parallaxX * 0.2,
      transform.target[1] + parallaxY * 0.2,
      transform.target[2],
    );

    if (prefersReducedMotion) {
      camera.position.set(destinationX, destinationY, destinationZ);
      currentLookAt.copy(destination);
      camera.lookAt(currentLookAt);
      if (
        camera instanceof THREE.PerspectiveCamera &&
        Math.abs(camera.fov - transform.fov) > 0.01
      ) {
        camera.fov = transform.fov;
        camera.updateProjectionMatrix();
      }
      return;
    }

    const alpha = 1 - Math.exp(-4.6 * Math.min(delta, 0.1));
    camera.position.x += (destinationX - camera.position.x) * alpha;
    camera.position.y += (destinationY - camera.position.y) * alpha;
    camera.position.z += (destinationZ - camera.position.z) * alpha;
    currentLookAt.lerp(destination, alpha);
    camera.lookAt(currentLookAt);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (transform.fov - camera.fov) * alpha;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
