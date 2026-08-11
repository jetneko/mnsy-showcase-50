import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { buildingMetrics } from "./building";

/**
 * Scroll-driven camera. Interpolates through 5 keyframes with easing and
 * applies subtle inertia via THREE.Vector3.lerp so movement never feels
 * mechanical.
 *
 * All look-at heights and camera heights are expressed as fractions of the
 * building's actual fitted height (published by HouseConstruction into
 * buildingMetrics), so the rig frames the real 4-story mass rather than a
 * fixed ground-level target.
 */
type Key = {
  t: number;
  /** Horizontal direction (normalized in code) the camera sits from center. */
  dir: [number, number];
  /** Horizontal distance as a multiple of the building's radius. */
  dist: number;
  /** Camera height as a fraction of building height. */
  camY: number;
  /** Look-at height as a fraction of building height (1 = roof line). */
  lookY: number;
};

const KEYS: Key[] = [
  // 0 — top-down blueprint (still aimed at the plan on the ground)
  { t: 0.0, dir: [0, 0.001], dist: 0.02, camY: 3.0, lookY: 0.02 },
  // 1 — tilt to high isometric as the ground floor rises
  { t: 0.22, dir: [0.7, 0.72], dist: 3.5, camY: 1.15, lookY: 0.5 },
  // 2 — gentle orbit around the mass, mid-height
  { t: 0.55, dir: [-0.55, 0.84], dist: 3.2, camY: 0.95, lookY: 0.52 },
  // 3 — three-quarter view as the upper floors settle
  { t: 0.82, dir: [0.55, 0.84], dist: 3.0, camY: 0.8, lookY: 0.5 },
  // 4 — dramatic hero angle, looking slightly up at the mass
  { t: 1.0, dir: [0.45, 0.89], dist: 2.75, camY: 0.5, lookY: 0.48 },
];


function ease(x: number) {
  // cubic in-out
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function apply(k: Key, out: THREE.Vector3, look: THREE.Vector3) {
  const h = buildingMetrics.height;
  const r = buildingMetrics.radius;
  const len = Math.hypot(k.dir[0], k.dir[1]) || 1;
  const d = k.dist * r;
  out.set((k.dir[0] / len) * d, k.camY * h, (k.dir[1] / len) * d);
  look.set(0, k.lookY * h, 0);
}

const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();
const _la = new THREE.Vector3();
const _lb = new THREE.Vector3();

function sampleKeys(p: number, out: THREE.Vector3, look: THREE.Vector3) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (p >= a.t && p <= b.t) {
      const e = ease((p - a.t) / (b.t - a.t));
      apply(a, _pa, _la);
      apply(b, _pb, _lb);
      out.set(lerp(_pa.x, _pb.x, e), lerp(_pa.y, _pb.y, e), lerp(_pa.z, _pb.z, e));
      look.set(lerp(_la.x, _lb.x, e), lerp(_la.y, _lb.y, e), lerp(_la.z, _lb.z, e));
      return;
    }
  }
  apply(KEYS[KEYS.length - 1], out, look);
}


export function CameraRig({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    sampleKeys(progress.current, targetPos.current, targetLook.current);
    // On mobile pull the camera back so the taller mass still frames well.
    if (mobile) {
      targetPos.current.multiplyScalar(1.2);
    }
    // Inertia: lerp toward target rather than snapping.
    // Catch up faster when far off-target (e.g. first frames after mount or a
    // large scroll jump) so the camera is never left inside the geometry.
    const far = camera.position.distanceTo(targetPos.current) > 4;
    camera.position.lerp(targetPos.current, far ? 0.4 : 0.12);
    currentLook.current.lerp(targetLook.current, far ? 0.4 : 0.12);
    camera.lookAt(currentLook.current);
  });
  return null;
}

