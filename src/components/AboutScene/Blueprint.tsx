import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";

/**
 * Blueprint layer: a glowing 2D floor plan drawn as LineSegments on the ground.
 * Fades in during stage 0, dissolves out as walls rise (stages 1–2).
 */
export function Blueprint() {
  const progress = useProgressRef();
  const lineRef = useRef<THREE.LineSegments>(null);
  const gridRef = useRef<THREE.Mesh>(null);

  // Floor plan lines: outer rectangle + interior partitions + door swings.
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    const seg = (x1: number, z1: number, x2: number, z2: number) => {
      pts.push(x1, 0.02, z1, x2, 0.02, z2);
    };
    // outer footprint (12 x 8)
    seg(-6, -4, 6, -4);
    seg(6, -4, 6, 4);
    seg(6, 4, -6, 4);
    seg(-6, 4, -6, -4);
    // interior partitions
    seg(-2, -4, -2, 1.5);
    seg(-2, 1.5, 3, 1.5);
    seg(3, 1.5, 3, 4);
    seg(1, -4, 1, -0.5);
    // dimension ticks
    for (let x = -6; x <= 6; x += 2) seg(x, -4.5, x, -4.3);
    for (let z = -4; z <= 4; z += 2) seg(-6.5, z, -6.3, z);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  useFrame(() => {
    const p = progress.current;
    // Blueprint visible during stages 0–1, dissolves through stage 2.
    const s0 = stageLocal(p, 0);
    const s1 = stageLocal(p, 1);
    const s2 = stageLocal(p, 2);
    const opacity = smoothstep(s0) * (1 - smoothstep(s2)) * (1 - 0.4 * smoothstep(s1));
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = opacity;
    }
    if (gridRef.current) {
      const mat = gridRef.current.material as THREE.MeshBasicMaterial;
      // Blueprint grid dissolves into ground as construction progresses.
      mat.opacity = 0.35 * (1 - smoothstep(stageLocal(p, 5)));
    }
  });

  return (
    <group>
      {/* Blueprint grid backdrop on the ground */}
      <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[40, 40, 40, 40]} />
        <meshBasicMaterial
          color="#4aa3ff"
          transparent
          opacity={0.35}
          wireframe
        />
      </mesh>
      <lineSegments ref={lineRef} geometry={geometry}>
        <lineBasicMaterial
          color="#7ec8ff"
          transparent
          opacity={0}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
