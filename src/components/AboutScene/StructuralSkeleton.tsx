import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { buildingMetrics, floorBeat, floorSlabY } from "./building";

/**
 * Procedural "columns and beams" pre-beat for each floor.
 *
 * Purely a visual rhythm layer: for every floor stage (1–5) a set of corner /
 * bay-spaced columns shoot upward from that floor's slab height, horizontal
 * beams then span between them, and the whole skeleton fades out as the real
 * GLTF floor geometry fades in on top of it. Geometry is estimated from the
 * building's fitted bounding box — it is not structurally accurate.
 */

const FLOOR_STAGES = [1, 2, 3, 4, 5];
const BAYS_X = 4; // columns along width
const BAYS_Z = 3; // columns along depth

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

  // One group per floor; each holds its columns and beams.
  const floors = useMemo(() => {
    const w = buildingMetrics.width * 0.86;
    const d = buildingMetrics.depth * 0.86;
    const nx = mobile ? 3 : BAYS_X;
    const nz = mobile ? 2 : BAYS_Z;

    return FLOOR_STAGES.map((stage, i) => {
      const baseY = floorSlabY(i);
      const topY = floorSlabY(i + 1) || buildingMetrics.height;
      const h = Math.max(0.6, topY - baseY);

      const columns: { pos: [number, number, number] }[] = [];
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          const x = -w / 2 + (w * ix) / (nx - 1);
          const z = -d / 2 + (d * iz) / (nz - 1);
          // Interior columns only on the perimeter for a cleaner read.
          const perimeter = ix === 0 || ix === nx - 1 || iz === 0 || iz === nz - 1;
          if (!perimeter) continue;
          columns.push({ pos: [x, baseY, z] });
        }
      }

      const beams: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
      const beamY = topY;
      beams.push({ pos: [0, beamY, -d / 2], scale: [w, 0.12, 0.12] });
      beams.push({ pos: [0, beamY, d / 2], scale: [w, 0.12, 0.12] });
      beams.push({ pos: [-w / 2, beamY, 0], scale: [0.12, 0.12, d] });
      beams.push({ pos: [w / 2, beamY, 0], scale: [0.12, 0.12, d] });

      return { stage, baseY, h, columns, beams };
    });
  }, [mobile]);

  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const p = progress.current;
    let maxOpacity = 0;

    floors.forEach((f, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      const beat = floorBeat(p, f.stage);
      maxOpacity = Math.max(maxOpacity, beat.skeleton);
      g.visible = beat.skeleton > 0.01;
      if (!g.visible) return;

      // children[0] = columns group, children[1] = beams group
      const cols = g.children[0] as THREE.Group;
      const bms = g.children[1] as THREE.Group;
      cols.children.forEach((c, ci) => {
        // Slight stagger so columns don't all shoot up in lockstep.
        const s = Math.max(0.001, Math.min(1, beat.columns * 1.25 - ci * 0.03));
        c.scale.y = s;
        c.position.y = f.baseY + (f.h * s) / 2;
      });
      bms.children.forEach((b, bi) => {
        const s = Math.max(0.001, Math.min(1, beat.beams * 1.3 - bi * 0.06));
        // Beams grow out along their long axis.
        if (b.userData.axis === "x") b.scale.x = s;
        else b.scale.z = s;
        void bi;
      });
    });

    columnMat.opacity = maxOpacity * 0.9;
    beamMat.opacity = maxOpacity * 0.9;
  });

  return (
    <group>
      {floors.map((f, i) => (
        <group key={f.stage} ref={(el) => (groupRefs.current[i] = el)} visible={false}>
          <group>
            {f.columns.map((c, ci) => (
              <mesh
                key={ci}
                position={c.pos}
                scale={[1, 0.001, 1]}
                material={columnMat}
              >
                <boxGeometry args={[0.16, f.h, 0.16]} />
              </mesh>
            ))}
          </group>
          <group>
            {f.beams.map((b, bi) => (
              <mesh
                key={bi}
                position={b.pos}
                material={beamMat}
                userData={{ axis: b.scale[0] > b.scale[2] ? "x" : "z" }}
                scale={[1, 1, 1]}
              >
                <boxGeometry args={b.scale} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}
