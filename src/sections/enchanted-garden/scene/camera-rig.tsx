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
  const { camera, pointer, size } = useThree();
  const transformRef = useRef(createJourneyCameraTransform());
  const currentLookAtRef = useRef<THREE.Vector3 | null>(null);
  const destinationRef = useRef<THREE.Vector3 | null>(null);
  const settledRef = useRef(false);
  const inputRef = useRef({
    progress: Number.NaN,
    pointerX: Number.NaN,
    pointerY: Number.NaN,
    mobileFraming: false,
  });

  currentLookAtRef.current ??= new THREE.Vector3(0, 2.5, 12);
  destinationRef.current ??= new THREE.Vector3(0, 2.5, 12);

  useFrame((_, delta) => {
    const mobileFraming = size.width <= 480;
    const pointerX = prefersReducedMotion ? 0 : pointer.x;
    const pointerY = prefersReducedMotion ? 0 : pointer.y;
    const progress = progressRef.current;
    const previousInput = inputRef.current;
    const inputChanged =
      Math.abs(progress - previousInput.progress) > 0.00001 ||
      Math.abs(pointerX - previousInput.pointerX) > 0.0001 ||
      Math.abs(pointerY - previousInput.pointerY) > 0.0001 ||
      mobileFraming !== previousInput.mobileFraming;
    if (!inputChanged && settledRef.current) return;

    previousInput.progress = progress;
    previousInput.pointerX = pointerX;
    previousInput.pointerY = pointerY;
    previousInput.mobileFraming = mobileFraming;
    const transform = writeJourneyCameraTransform(
      progress,
      transformRef.current,
    );
    const parallaxX = pointerX * 0.35;
    const parallaxY = pointerY * 0.18;
    const mobilePullback = mobileFraming ? 7 : 0;
    const mobileLift = mobileFraming ? 0.4 : 0;
    const destination = destinationRef.current!;
    const currentLookAt = currentLookAtRef.current!;

    const destinationX = transform.position[0] + parallaxX;
    const destinationY = transform.position[1] + parallaxY + mobileLift;
    const destinationZ = transform.position[2] + mobilePullback;
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
        Math.abs(camera.fov - (transform.fov + (mobileFraming ? 6 : 0))) > 0.01
      ) {
        camera.fov = transform.fov + (mobileFraming ? 6 : 0);
        camera.updateProjectionMatrix();
      }
      settledRef.current = true;
      return;
    }

    const alpha = 1 - Math.exp(-4.6 * Math.min(delta, 0.1));
    camera.position.x += (destinationX - camera.position.x) * alpha;
    camera.position.y += (destinationY - camera.position.y) * alpha;
    camera.position.z += (destinationZ - camera.position.z) * alpha;
    currentLookAt.lerp(destination, alpha);
    camera.lookAt(currentLookAt);

    if (camera instanceof THREE.PerspectiveCamera) {
      const destinationFov = transform.fov + (mobileFraming ? 6 : 0);
      const previousFov = camera.fov;
      camera.fov += (destinationFov - camera.fov) * alpha;
      if (Math.abs(camera.fov - previousFov) > 0.0001) {
        camera.updateProjectionMatrix();
      }
      const dx = destinationX - camera.position.x;
      const dy = destinationY - camera.position.y;
      const dz = destinationZ - camera.position.z;
      settledRef.current =
        dx * dx + dy * dy + dz * dz < 0.0001 &&
        currentLookAt.distanceToSquared(destination) < 0.0001 &&
        Math.abs(destinationFov - camera.fov) <= 0.01;
    }
  });

  return null;
}
