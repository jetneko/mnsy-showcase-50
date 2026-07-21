import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";
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

// How far below the resting position each floor starts before rising.
const RISE_DISTANCE = 6;

/**
 * Loads the split-by-floor Mars Chua GLTF once, normalizes its transform to
 * fit the camera rig, then animates each floor node up from below and fades
 * it in as its stage becomes active. Landscape ground fades in around the
 * base during the final stage.
 */
export function HouseConstruction({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();
  const gltf = useGLTF(modelAsset.url);

  const groundRef = useRef<THREE.Mesh>(null);
  const hedgesRef = useRef<THREE.Group>(null);

  // Build a normalized scene: clone, center on origin, scale to fit,
  // and collect handles to each named floor node with its resting Y.
  const { root, floors } = useMemo(() => {
    const cloned = gltf.scene.clone(true);

    // Preserve source-material appearance but ensure PBR + shadows are set up.
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (std && "roughness" in std) {
            std.envMapIntensity = 1.0;
            std.needsUpdate = true;
          }
        });
      }
    });

    // Compute overall bounds to normalize scale/position for the camera rig,
    // which was tuned around a ~6-unit-tall building centered at origin.
    const bbox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    const targetHeight = 6.5;
    const scale = size.y > 0.001 ? targetHeight / size.y : 1;

    cloned.scale.setScalar(scale);
    // Recenter horizontally on origin, and drop the base to y=0.
    cloned.position.set(
      -center.x * scale,
      -bbox.min.y * scale,
      -center.z * scale,
    );

    // Find each named floor node and record its resting Y offset.
    type FloorHandle = {
      name: FloorName;
      node: THREE.Object3D;
      restY: number;
      material?: THREE.MeshStandardMaterial;
      opacityTargets: { mat: THREE.Material; original: number }[];
    };
    const found: FloorHandle[] = [];
    FLOOR_NODES.forEach((name) => {
      const node = cloned.getObjectByName(name);
      if (!node) return;
      const restY = node.position.y;
      const opacityTargets: FloorHandle["opacityTargets"] = [];
      node.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          // Clone material so opacity changes don't leak across floors that share one.
          const cloneMat = m.clone();
          cloneMat.transparent = true;
          const original = (cloneMat as THREE.MeshStandardMaterial).opacity ?? 1;
          if (Array.isArray(mesh.material)) {
            const idx = (mesh.material as THREE.Material[]).indexOf(m);
            (mesh.material as THREE.Material[])[idx] = cloneMat;
          } else {
            mesh.material = cloneMat;
          }
          opacityTargets.push({ mat: cloneMat, original });
        });
      });
      found.push({ name, node, restY, opacityTargets });
    });

    return { root: cloned, floors: found };
  }, [gltf.scene]);

  // Set every floor to its below-ground start position on first mount so
  // there's no flash of the whole building before scroll begins.
  useEffect(() => {
    floors.forEach((f) => {
      f.node.position.y = f.restY - RISE_DISTANCE;
      f.opacityTargets.forEach((t) => {
        (t.mat as THREE.MeshStandardMaterial).opacity = 0;
      });
    });
  }, [floors]);

  // Hedge positions flanking a nominal front — sized to the normalized building.
  const hedgeDefs = useMemo(
    () =>
      [
        { pos: [-3.4, 0.4, 5.2] as const },
        { pos: [-0.6, 0.4, 5.2] as const },
        { pos: [-4.5, 0.4, 5.2] as const },
        { pos: [0.3, 0.4, 5.2] as const },
      ] as const,
    [],
  );

  useFrame(() => {
    const p = progress.current;

    // Animate each floor node relative to its own stage.
    floors.forEach((f) => {
      const stageIdx = FLOOR_STAGE[f.name];
      // Give a slight lead-in so the next floor starts rising before the
      // previous one is fully settled — feels continuous, not stepwise.
      const s = smoothstep(stageLocal(p, stageIdx));
      f.node.position.y = f.restY - RISE_DISTANCE * (1 - s);
      const op = s;
      f.opacityTargets.forEach((t) => {
        (t.mat as THREE.MeshStandardMaterial).opacity = t.original * op;
      });
    });

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

      {/* Foundation slab under the building */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[14, 0.1, 10]} />
        <meshStandardMaterial color="#1e2530" roughness={1} />
      </mesh>

      {/* The real Mars Chua model, split by floor. */}
      <primitive object={root} />

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
