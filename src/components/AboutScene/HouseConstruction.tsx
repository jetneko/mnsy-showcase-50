import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";
import {
  TARGET_SPAN,
  buildingMetrics,
  floorBeat,
  floorSlabY,
} from "./building";
import modelAsset from "@/assets/mars_chua_floors.gltf.asset.json";

// Node names in the split GLTF (bottom → top).
const FLOOR_NODES = ["GroundFloor", "Floor2", "Floor3", "Floor4", "Roof"] as const;
type FloorName = (typeof FLOOR_NODES)[number];

// Each floor node maps to a stage index in the 6-stage story
// (stage 0 = blueprint, stages 1–5 = the five floor pieces).
const FLOOR_STAGE: Record<FloorName, number> = {
  GroundFloor: 1,
  Floor2: 2,
  Floor3: 3,
  Floor4: 4,
  Roof: 5,
};


// --- Refined exterior palette -------------------------------------------------
// Warm off-white render for the main wall mass, sandstone ashlar as the accent
// cladding, dark bronze trim, and lightly tinted reflective glass.
const COLOR_RENDER = "#e6ddd0"; // warm off-white / light taupe
const COLOR_SANDSTONE = "#c9a884"; // ashlar light accent
const COLOR_TRIM = "#2f3238";
const COLOR_GLASS = "#8fb3c9";

/** Classify a source material by its name so we can restyle it sensibly. */
function classify(name: string): "glass" | "stone" | "trim" | "render" {
  const n = name.toLowerCase();
  if (n.includes("glass") || n.includes("window") || n.includes("glazing")) return "glass";
  if (n.includes("stone") || n.includes("ashlar") || n.includes("sand") || n.includes("brick"))
    return "stone";
  if (
    n.includes("metal") ||
    n.includes("frame") ||
    n.includes("trim") ||
    n.includes("steel") ||
    n.includes("black") ||
    n.includes("dark")
  )
    return "trim";
  return "render";
}

/**
 * Loads the split-by-floor Mars Chua GLTF once, normalizes its transform to
 * fit the camera rig, restyles its raw CAD materials into a refined exterior
 * palette, then animates each floor node up from below and fades it in as its
 * stage becomes active. Thin trim strips mark each floor-to-floor seam so the
 * height-based split reads as an intentional floor line.
 */
export function HouseConstruction({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();
  const gltf = useGLTF(modelAsset.url);

  const groundRef = useRef<THREE.Mesh>(null);
  const hedgesRef = useRef<THREE.Group>(null);
  const seamsRef = useRef<THREE.Group>(null);

  // Build a normalized scene: clone, center on origin, scale to fit,
  // and collect handles to each named floor node with its resting Y.
  const { root, floors, upAxis, riseLocal } = useMemo(() => {
    const cloned = gltf.scene.clone(true);

    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // SketchUp exports are frequently Z-up: if the "depth" axis is clearly
    // taller than the Y axis, rotate the model upright first.
    const raw = new THREE.Box3().setFromObject(cloned);
    const rawSize = raw.getSize(new THREE.Vector3());
    const zUp = rawSize.z > rawSize.y * 1.4;
    if (zUp) {
      cloned.rotation.x = -Math.PI / 2;
      cloned.updateMatrixWorld(true);
    }
    // After rotation, local +Z maps to world +Y — that's the axis floors rise on.
    const upAxis: "y" | "z" = zUp ? "z" : "y";

    // Compute overall bounds to normalize scale/position for the camera rig.
    const bbox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    // Fit the longest horizontal span (this is a wide multi-unit block, so
    // fitting by height alone would leave it far too large for the rig).
    const span = Math.max(size.x, size.z);
    const scale = span > 0.001 ? TARGET_SPAN / span : 1;

    cloned.scale.setScalar(scale);
    // Recenter horizontally on origin, and drop the base to y=0.
    cloned.position.set(-center.x * scale, -bbox.min.y * scale, -center.z * scale);

    // Publish real fitted metrics for the camera rig + structural skeleton.
    buildingMetrics.height = size.y * scale;
    buildingMetrics.width = size.x * scale;
    buildingMetrics.depth = size.z * scale;
    buildingMetrics.centerY = buildingMetrics.height / 2;
    buildingMetrics.radius = Math.max(buildingMetrics.width, buildingMetrics.depth) / 2;


    // Rise distance in the model's own (pre-scale) units so it reads the same
    // regardless of how large the source model is.
    const riseLocal = size.y / scale;

    // Find each named floor node and record its resting position on the up axis.
    type FloorHandle = {
      name: FloorName;
      node: THREE.Object3D;
      restY: number;
      opacityTargets: { mat: THREE.Material; original: number }[];
    };
    const found: FloorHandle[] = [];
    FLOOR_NODES.forEach((name, floorIdx) => {
      const node = cloned.getObjectByName(name);
      if (!node) return;
      const restY = node.position[upAxis];

      const opacityTargets: FloorHandle["opacityTargets"] = [];
      node.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        // Render lower floors first; avoids z-fighting flicker at the seams
        // between adjacent height bins that share coplanar faces.
        mesh.renderOrder = floorIdx;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          // Clone material so opacity changes don't leak across floors that share one.
          const std = m.clone() as THREE.MeshStandardMaterial;
          const kind = classify(m.name ?? "");

          std.transparent = true;
          std.metalness = 0;
          std.envMapIntensity = 1.0;
          // Push each floor's faces slightly apart in depth so coplanar
          // triangles from neighbouring bins don't fight for the same pixels.
          std.polygonOffset = true;
          std.polygonOffsetFactor = -1 - floorIdx;
          std.polygonOffsetUnits = -1;

          switch (kind) {
            case "glass":
              std.color = new THREE.Color(COLOR_GLASS);
              std.roughness = 0.12;
              std.metalness = 0.35;
              std.envMapIntensity = 1.6;
              std.opacity = 0.55;
              break;
            case "stone":
              std.color = new THREE.Color(COLOR_SANDSTONE);
              std.roughness = 0.82;
              std.opacity = 1;
              break;
            case "trim":
              std.color = new THREE.Color(COLOR_TRIM);
              std.roughness = 0.55;
              std.metalness = 0.25;
              std.opacity = 1;
              break;
            default:
              std.color = new THREE.Color(COLOR_RENDER);
              std.roughness = 0.78;
              std.opacity = 1;
              break;
          }
          std.needsUpdate = true;

          if (Array.isArray(mesh.material)) {
            const idx = (mesh.material as THREE.Material[]).indexOf(m);
            (mesh.material as THREE.Material[])[idx] = std;
          } else {
            mesh.material = std;
          }
          opacityTargets.push({ mat: std, original: std.opacity });
        });
      });
      found.push({ name, node, restY, opacityTargets });
    });

    return { root: cloned, floors: found, upAxis, riseLocal };
  }, [gltf.scene]);

  // Set every floor to its below-ground start position on first mount so
  // there's no flash of the whole building before scroll begins.
  useEffect(() => {
    floors.forEach((f) => {
      (f.node.position as unknown as Record<string, number>)[upAxis] =
        f.restY - riseLocal;
      f.opacityTargets.forEach((t) => {
        (t.mat as THREE.MeshStandardMaterial).opacity = 0;
      });
    });
  }, [floors, upAxis, riseLocal]);


  // Thin trim strips at each floor-to-floor seam — reads as an intentional
  // floor line / shadow gap rather than a geometry glitch.
  const seamDefs = useMemo(
    () =>
      [1, 2, 3, 4].map((i) => ({
        stage: i,
        y: floorSlabY(i),
        w: buildingMetrics.width * 1.005,
        d: buildingMetrics.depth * 1.005,
      })),
    // Recompute when the model (and thus metrics) changes.
    [floors],
  );

  const seamMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#1b1e24"),
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  // Hedge positions along the front edge — derived from the fitted footprint.
  const hedgeDefs = useMemo(() => {
    const w = buildingMetrics.width;
    const z = buildingMetrics.depth * 0.62;
    const n = 6;
    return Array.from({ length: n }, (_, i) => ({
      pos: [-w / 2 + (w * i) / (n - 1), 0.35, z] as [number, number, number],
    }));
    // Recompute once the model's metrics are published.
  }, [floors]);


  useFrame(() => {
    const p = progress.current;

    // Animate each floor node relative to its own stage. The reveal curve
    // settles fully (reveal === 1) well before the next stage begins, so a
    // floor is locked in place — no residual drift at the seams — while the
    // next floor's skeleton beat leads in.
    floors.forEach((f) => {
      const stageIdx = FLOOR_STAGE[f.name];
      const { reveal } = floorBeat(p, stageIdx);
      (f.node.position as unknown as Record<string, number>)[upAxis] =
        f.restY - riseLocal * (1 - reveal);
      f.opacityTargets.forEach((t) => {
        (t.mat as THREE.MeshStandardMaterial).opacity = t.original * reveal;
      });
    });

    // Seam strips appear with the floor that lands on them.
    if (seamsRef.current) {
      let op = 0;
      seamsRef.current.children.forEach((s, i) => {
        const { reveal } = floorBeat(p, seamDefs[i].stage);
        s.visible = reveal > 0.02;
        op = Math.max(op, reveal);
      });
      seamMat.opacity = op * 0.85;
    }

    // Landscape: ground shifts dirt → grass across the final stage,
    // hedges pop in around the base.
    const landS = smoothstep(stageLocal(p, 5));
    if (groundRef.current) {
      const mat = groundRef.current.material as THREE.MeshStandardMaterial;
      const dirt = new THREE.Color("#141a26");
      const grass = new THREE.Color("#3d5f34");
      mat.color.copy(dirt).lerp(grass, landS);
    }
    if (hedgesRef.current) {
      hedgesRef.current.children.forEach((h, i) => {
        const s = smoothstep(Math.max(0, landS * 1.4 - i * 0.08));
        h.scale.set(s, s, s);
      });
    }
  });

  return (
    <group>
      {/* Ground plane */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#141a26" roughness={1} />
      </mesh>

      {/* Foundation slab under the building, sized to the fitted footprint */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry
          args={[buildingMetrics.width * 1.12, 0.1, buildingMetrics.depth * 1.3]}
        />
        <meshStandardMaterial color="#1e2530" roughness={1} />
      </mesh>


      {/* The real Mars Chua model, split by floor. */}
      <primitive object={root} />

      {/* Floor-line trim strips at each height-split seam. */}
      <group ref={seamsRef}>
        {seamDefs.map((s) => (
          <mesh key={s.stage} position={[0, s.y, 0]} material={seamMat} visible={false}>
            <boxGeometry args={[s.w, 0.05, s.d]} />
          </mesh>
        ))}
      </group>

      {/* Hedges — landscape stage */}
      <group ref={hedgesRef}>
        {hedgeDefs.map((h, i) => (
          <mesh key={i} position={h.pos} castShadow scale={0.0001}>
            <boxGeometry args={[1.4, 0.7, 0.7]} />
            <meshStandardMaterial color="#26492a" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Silence unused-prop warning while keeping the mobile signature. */}
      {mobile ? null : null}
    </group>
  );
}

// Preload so the model streams alongside the lazy chunk.
useGLTF.preload(modelAsset.url);
