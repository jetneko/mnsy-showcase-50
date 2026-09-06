import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal, STAGE } from "./stages";
import {
  BUILDING_CENTER,
  BUILDING_SCALE,
  BUILDING_SIZE,
  buildingMetrics,
  partReveal,
} from "./building";
import modelAsset from "@/assets/mars_chua_parts.gltf.asset.json";

/**
 * The parts GLTF ships four genuinely separate objects. Each maps to one stage
 * of the 8-beat story; the model's own baked materials (warm off-white render,
 * sandstone ashlar accent, dark charcoal roof, dark aluminium frames,
 * blue-tinted glass) are used as authored — nothing is recolored here.
 */
const PART_NODES = ["FLOOR", "WALLS", "WINDOWS", "ROOF"] as const;
type PartName = (typeof PART_NODES)[number];

const PART_STAGE: Record<PartName, number> = {
  FLOOR: STAGE.FLOOR,
  WALLS: STAGE.WALLS,
  WINDOWS: STAGE.WINDOWS,
  ROOF: STAGE.ROOF,
};

export function HouseConstruction({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();
  const gltf = useGLTF(modelAsset.url);

  const groundRef = useRef<THREE.Mesh>(null);
  const hedgesRef = useRef<THREE.Group>(null);

  // Normalize the scene: clone, center the real building on the origin with its
  // base at y=0, scale it to fit the camera rig, and collect a handle per part.
  const { root, parts, glassMats, riseLocal } = useMemo(() => {
    const cloned = gltf.scene.clone(true);

    const scale = BUILDING_SCALE;
    cloned.scale.setScalar(scale);
    cloned.position.set(-BUILDING_CENTER.x * scale, 0, -BUILDING_CENTER.z * scale);

    // Rise distance in the model's own (pre-scale) units.
    const riseLocal = BUILDING_SIZE.y;

    type PartHandle = { name: PartName; node: THREE.Object3D; restY: number };
    const found: PartHandle[] = [];
    // Glass materials get a dusk-to-lit emissive glow during the finish beat.
    const glassMats: THREE.MeshStandardMaterial[] = [];

    PART_NODES.forEach((name, idx) => {
      const node = cloned.getObjectByName(name);
      if (!node) {
        console.warn(`[AboutScene] node "${name}" is missing from the GLTF`);
        return;
      }
      let meshCount = 0;
      node.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshCount++;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Draw lower/inner parts first so coplanar shells never flicker.
        mesh.renderOrder = idx;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (!std) return;
          // Materials are authored in the model — keep every color/roughness as
          // exported. Only collect the glazing so it can light up at dusk.
          if (std.transparent) {
            std.depthWrite = false;
            if (!glassMats.includes(std)) glassMats.push(std);
          }
        });
      });
      if (meshCount === 0) {
        console.warn(`[AboutScene] node "${name}" has no drawable meshes`);
      }
      found.push({ name, node, restY: node.position.y });
    });

    return { root: cloned, parts: found, glassMats, riseLocal };
  }, [gltf.scene]);

  // Park every part below ground and hide it on mount so there's no flash of
  // the finished building before the scroll story begins.
  useEffect(() => {
    parts.forEach((part) => {
      part.node.visible = false;
      part.node.position.y = part.restY - riseLocal;
    });
  }, [parts, riseLocal]);

  // Hedge positions along the front edge — derived from the fitted footprint.
  const hedgeDefs = useMemo(() => {
    const w = buildingMetrics.width;
    const z = buildingMetrics.depth * 0.62;
    const n = mobile ? 4 : 6;
    return Array.from({ length: n }, (_, i) => ({
      pos: [-w / 2 + (w * i) / (n - 1), 0.35, z] as [number, number, number],
    }));
  }, [mobile]);

  useFrame(() => {
    const p = progress.current;

    // Each part is a solid, complete piece: it stays fully opaque and simply
    // slides up into place over its stage — no per-triangle reveal.
    parts.forEach((part) => {
      const reveal = partReveal(p, PART_STAGE[part.name]);
      part.node.visible = reveal > 0.001;
      part.node.position.y = part.restY - riseLocal * (1 - reveal);
    });

    // Finish beat (stage 7 of 8): the glazing warms up from cold to lit.
    const lit = smoothstep(stageLocal(p, STAGE.FINISH));
    glassMats.forEach((m) => {
      if (!m.emissive) m.emissive = new THREE.Color();
      m.emissive.setRGB(1, 0.86, 0.66);
      m.emissiveIntensity = 0.55 * lit;
    });

    // Landscape: ground shifts dirt → grass, hedges pop in around the base.
    const landS = smoothstep(stageLocal(p, STAGE.LANDSCAPE));
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
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#141a26" roughness={1} />
      </mesh>

      {/* Foundation slab, just below the blueprint plan so it never occludes it */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[buildingMetrics.width * 1.04, 0.1, buildingMetrics.depth * 1.06]} />
        <meshStandardMaterial color="#1e2530" roughness={1} />
      </mesh>

      {/* The real model, split into FLOOR / WALLS / WINDOWS / ROOF. */}
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
    </group>
  );
}

// Preload so the model streams alongside the lazy chunk.
useGLTF.preload(modelAsset.url);
