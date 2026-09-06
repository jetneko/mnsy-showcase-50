import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { buildingMetrics, skeletonBeat } from "./building";
import { STAGE } from "./stages";

/**
 * Single full-height "columns and beams" pass (stage 3 of 8).
 *
 * Perimeter columns rise from the ground slab all the way to the roof line,
 * then a beam ring spans across their tops. The whole skeleton fades out as the
 * WALLS mass rises in the next stage. Geometry is estimated from the building's
 * fitted footprint — a visual rhythm layer, not a structural drawing.
 */

const BAYS_X = 5; // columns along width
const BAYS_Z = 4; // columns along depth
const BEAM = 0.16; // beam section (also the column/beam overlap)
const COL = 0.18; // column section

export function StructuralSkeleton({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();

  const columnMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7fa6c9"),
        emissive: new THREE.Color("#2b4f73"),
        emissiveIntensity: 0.8,
        roughness: 0.6,
        metalness: 0.1,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const beamMat = useMemo(() => {
    const m = columnMat.clone();
    m.color = new THREE.Color("#a9c6e0");
    return m;
  }, [columnMat]);

  const { columns, beams, colHeight, colBase } = useMemo(() => {
    // Inset from the fitted footprint so the frame sits just inside the facade.
    const w = buildingMetrics.width - 1.1;
    const d = buildingMetrics.depth - 1.1;
    const top = buildingMetrics.height; // roof line
    const colBase = -0.05; // sinks into the slab: no gap at the base
    const colHeight = top - BEAM - colBase; // meets the beam underside exactly

    const nx = mobile ? 3 : BAYS_X;
    const nz = mobile ? 3 : BAYS_Z;

    const columns: { pos: [number, number, number] }[] = [];
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const perimeter = ix === 0 || ix === nx - 1 || iz === 0 || iz === nz - 1;
        if (!perimeter) continue;
        const x = -w / 2 + (w * ix) / (nx - 1);
        const z = -d / 2 + (d * iz) / (nz - 1);
        columns.push({ pos: [x, colBase, z] });
      }
    }

    // Beam ring: its top face is flush with the roof line, sitting directly on
    // top of the columns.
    const beamY = top - BEAM / 2;
    const beams: {
      pos: [number, number, number];
      size: [number, number, number];
      axis: "x" | "z";
    }[] = [
      { pos: [0, beamY, -d / 2], size: [w + BEAM, BEAM, BEAM], axis: "x" },
      { pos: [0, beamY, d / 2], size: [w + BEAM, BEAM, BEAM], axis: "x" },
      { pos: [-w / 2, beamY, 0], size: [BEAM, BEAM, d + BEAM], axis: "z" },
      { pos: [w / 2, beamY, 0], size: [BEAM, BEAM, d + BEAM], axis: "z" },
    ];

    return { columns, beams, colHeight, colBase };
  }, [mobile]);

  const rootRef = useRef<THREE.Group>(null);
  const colsRef = useRef<THREE.Group>(null);
  const beamsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const beat = skeletonBeat(progress.current, STAGE.SKELETON, STAGE.WALLS);
    const g = rootRef.current;
    if (!g) return;
    g.visible = beat.opacity > 0.01;
    columnMat.opacity = beat.opacity * 0.9;
    beamMat.opacity = beat.opacity * 0.9;
    if (!g.visible) return;

    colsRef.current?.children.forEach((c, ci) => {
      // Slight stagger so columns don't all shoot up in lockstep.
      const s = Math.max(0.001, Math.min(1, beat.columns * 1.2 - ci * 0.02));
      c.scale.y = s;
      c.position.y = colBase + (colHeight * s) / 2;
    });
    beamsRef.current?.children.forEach((b, bi) => {
      const s = Math.max(0.001, Math.min(1, beat.beams * 1.3 - bi * 0.06));
      if (b.userData.axis === "x") b.scale.x = s;
      else b.scale.z = s;
    });
  });

  return (
    <group ref={rootRef} visible={false}>
      <group ref={colsRef}>
        {columns.map((c, ci) => (
          <mesh key={ci} position={c.pos} scale={[1, 0.001, 1]} material={columnMat}>
            <boxGeometry args={[COL, colHeight, COL]} />
          </mesh>
        ))}
      </group>
      <group ref={beamsRef}>
        {beams.map((b, bi) => (
          <mesh key={bi} position={b.pos} material={beamMat} userData={{ axis: b.axis }}>
            <boxGeometry args={b.size} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
