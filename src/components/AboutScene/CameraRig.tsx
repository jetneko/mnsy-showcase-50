import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";

/**
 * Scroll-driven camera. Interpolates through 5 keyframes with easing and
 * applies subtle inertia via THREE.Vector3.lerp so movement never feels
 * mechanical. Also nudges the camera target so we orbit gently around
 * the house at later stages.
 */
type Key = { t: number; pos: [number, number, number]; look: [number, number, number] };

const KEYS: Key[] = [
  // 0 — top-down blueprint
  { t: 0.0, pos: [0, 22, 0.01], look: [0, 0, 0] },
  // 1 — tilt to high isometric as walls rise
  { t: 0.22, pos: [14, 14, 14], look: [0, 1.5, 0] },
  // 2 — orbit around the house
  { t: 0.55, pos: [-16, 8, 10], look: [0, 2, 0] },
  // 3 — zoom in as materials/landscape settle
  { t: 0.82, pos: [12, 4.5, 12], look: [0, 2, 0] },
  // 4 — dramatic hero angle
  { t: 1.0, pos: [10, 3.5, 16], look: [0, 2.2, 0] },
];

function ease(x: number) {
  // cubic in-out
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function sampleKeys(p: number, out: THREE.Vector3, look: THREE.Vector3) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (p >= a.t && p <= b.t) {
      const local = (p - a.t) / (b.t - a.t);
      const e = ease(local);
      out.set(
        a.pos[0] + (b.pos[0] - a.pos[0]) * e,
        a.pos[1] + (b.pos[1] - a.pos[1]) * e,
        a.pos[2] + (b.pos[2] - a.pos[2]) * e,
      );
      look.set(
        a.look[0] + (b.look[0] - a.look[0]) * e,
        a.look[1] + (b.look[1] - a.look[1]) * e,
        a.look[2] + (b.look[2] - a.look[2]) * e,
      );
      return;
    }
  }
  const last = KEYS[KEYS.length - 1];
  out.set(...last.pos);
  look.set(...last.look);
}

export function CameraRig({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    sampleKeys(progress.current, targetPos.current, targetLook.current);
    // On mobile pull the camera slightly back so the house frames well.
    if (mobile) {
      targetPos.current.multiplyScalar(1.15);
    }
    // Inertia: lerp toward target rather than snapping.
    camera.position.lerp(targetPos.current, 0.08);
    currentLook.current.lerp(targetLook.current, 0.08);
    camera.lookAt(currentLook.current);
  });
  return null;
}
