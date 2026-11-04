import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { STAGE } from "./stages";
import { BUILDING_CENTER, BUILDING_SCALE, easeSnap, partRamp } from "./building";

/**
 * The GLTF's DOORS node exported empty, so the entry doors are built here.
 * Placed on the front (+z) wall face of the model — model z ≈ -16.82 — centred
 * on the facade, at ground level. Sizes are in model metres, then scaled.
 */
const FRONT_Z = -16.82;
const DOOR_W = 1.1;
const DOOR_H = 2.5;
const FRAME = 0.08;
const DEPTH = 0.12;
const DOORS_X = [BUILDING_CENTER.x - DOOR_W / 2 - FRAME / 2, BUILDING_CENTER.x + DOOR_W / 2 + FRAME / 2];

export function ProceduralDoors() {
  const progress = useProgressRef();
  const leaves = useRef<(THREE.Group | null)[]>([]);
  const root = useRef<THREE.Group>(null);

  useFrame(() => {
    const ramp = partRamp(progress.current, STAGE.WINDOWS);
    if (root.current) root.current.visible = ramp > 0.001;
    leaves.current.forEach((g, i) => {
      if (!g) return;
      const local = Math.min(1, Math.max(0, (ramp - i * 0.15) / 0.7));
      // Swing shut from 80° open, snapping onto the frame.
      const e = local <= 0 ? 0 : easeSnap(local);
      const dir = i === 0 ? -1 : 1;
      g.rotation.y = dir * (1 - e) * 1.4;
      g.scale.setScalar(Math.max(0.0001, Math.min(1, local * 3)));
    });
  });

  const s = BUILDING_SCALE;
  const z = (FRONT_Z - BUILDING_CENTER.z) * s + (DEPTH / 2) * s + 0.01;

  return (
    <group ref={root} visible={false}>
      {/* Outer frame */}
      <mesh position={[0, (DOOR_H + FRAME / 2) * s, z]} castShadow>
        <boxGeometry args={[(DOOR_W * 2 + FRAME * 3) * s, FRAME * s, DEPTH * s]} />
        <meshStandardMaterial color="#1b1d21" roughness={0.45} metalness={0.3} />
      </mesh>
      {DOORS_X.map((mx, i) => {
        const hingeX = (mx - BUILDING_CENTER.x + (i === 0 ? -DOOR_W / 2 : DOOR_W / 2)) * s;
        const off = (i === 0 ? DOOR_W / 2 : -DOOR_W / 2) * s;
        return (
          <group
            key={i}
            position={[hingeX, 0, z]}
            ref={(g) => {
              leaves.current[i] = g;
            }}
          >
            {/* Dark panel */}
            <mesh position={[off, (DOOR_H / 2) * s, 0]} castShadow>
              <boxGeometry args={[DOOR_W * s, DOOR_H * s, DEPTH * 0.6 * s]} />
              <meshStandardMaterial color="#22252b" roughness={0.5} metalness={0.25} />
            </mesh>
            {/* Slim oak insert */}
            <mesh position={[off, (DOOR_H / 2) * s, DEPTH * 0.31 * s]}>
              <boxGeometry args={[DOOR_W * 0.22 * s, DOOR_H * 0.8 * s, 0.01 * s]} />
              <meshStandardMaterial color="#9a6a3f" roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
