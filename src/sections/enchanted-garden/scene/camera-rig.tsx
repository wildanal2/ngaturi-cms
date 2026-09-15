import { useEffect, useRef } from "react";
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
  const cameraRef = useRef(camera);
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

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useFrame((_, delta) => {
    const activeCamera = cameraRef.current;
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
      activeCamera.position.set(destinationX, destinationY, destinationZ);
      currentLookAt.copy(destination);
      activeCamera.lookAt(currentLookAt);
      if (
        activeCamera instanceof THREE.PerspectiveCamera &&
        Math.abs(
          activeCamera.fov - (transform.fov + (mobileFraming ? 6 : 0)),
        ) > 0.01
      ) {
        activeCamera.fov = transform.fov + (mobileFraming ? 6 : 0);
        activeCamera.updateProjectionMatrix();
      }
      settledRef.current = true;
      return;
    }

    const alpha = 1 - Math.exp(-4.6 * Math.min(delta, 0.1));
    activeCamera.position.x +=
      (destinationX - activeCamera.position.x) * alpha;
    activeCamera.position.y +=
      (destinationY - activeCamera.position.y) * alpha;
    activeCamera.position.z +=
      (destinationZ - activeCamera.position.z) * alpha;
    currentLookAt.lerp(destination, alpha);
    activeCamera.lookAt(currentLookAt);

    if (activeCamera instanceof THREE.PerspectiveCamera) {
      const destinationFov = transform.fov + (mobileFraming ? 6 : 0);
      const previousFov = activeCamera.fov;
      activeCamera.fov += (destinationFov - activeCamera.fov) * alpha;
      if (Math.abs(activeCamera.fov - previousFov) > 0.0001) {
        activeCamera.updateProjectionMatrix();
      }
      const dx = destinationX - activeCamera.position.x;
      const dy = destinationY - activeCamera.position.y;
      const dz = destinationZ - activeCamera.position.z;
      settledRef.current =
        dx * dx + dy * dy + dz * dz < 0.0001 &&
        currentLookAt.distanceToSquared(destination) < 0.0001 &&
        Math.abs(destinationFov - activeCamera.fov) <= 0.01;
    }
  });

  return null;
}
