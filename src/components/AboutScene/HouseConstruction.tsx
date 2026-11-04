import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal, STAGE } from "./stages";
import {
  BUILDING_CENTER,
  BUILDING_SCALE,
  BUILDING_SIZE,
  buildingMetrics,
  easeOutBack,
  easeSnap,
  partRamp,
  partReveal,
} from "./building";
import { ProceduralDoors } from "./ProceduralDoors";
import modelUrl from "@/assets/mars_chua_parts.gltf?url";

/**
 * The parts GLTF ships four genuinely separate objects. Each maps to one stage
 * of the 8-beat story; the model's own baked materials (warm off-white render,
 * sandstone ashlar accent, dark charcoal roof, dark aluminium frames,
 * blue-tinted glass) are used as authored — nothing is recolored here.
 *
 * Each part gets its own animation language:
 *   FLOOR   — slab rises from below ground and settles with weight (ease-out-back)
 *   WALLS   — stays put; a horizontal clipping plane rises so the mass is
 *             literally built upward course by course
 *   WINDOWS — panes pop in from scale 0 with a left-to-right stagger
 *   ROOF    — descends from above and settles onto the walls
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
  const gltf = useGLTF(modelUrl);
  const { gl } = useThree();

  const groundRef = useRef<THREE.Mesh>(null);
  const hedgesRef = useRef<THREE.Group>(null);

  // Local clipping is required for the wall build-up reveal.
  useEffect(() => {
    const prev = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => {
      gl.localClippingEnabled = prev;
    };
  }, [gl]);

  // Normalize the scene: clone, center the real building on the origin with its
  // base at y=0, scale it to fit the camera rig, and collect a handle per part.
  const { root, parts, glassMats, riseLocal, wallClip, panes } = useMemo(() => {
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
    // World-space clip plane for the WALLS build-up (normal points down, so
    // only geometry BELOW the plane height survives).
    const wallClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    type Pane = { mesh: THREE.Mesh; rest: THREE.Vector3; delay: number };
    const panes: Pane[] = [];

    PART_NODES.forEach((name, idx) => {
      const node = cloned.getObjectByName(name);
      if (!node) {
        console.warn(`[AboutScene] node "${name}" is missing from the GLTF`);
        return;
      }
      let meshCount = 0;
      const paneMeshes: THREE.Mesh[] = [];
      node.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshCount++;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Draw lower/inner parts first so coplanar shells never flicker.
        mesh.renderOrder = idx;
        if (name === "WINDOWS") paneMeshes.push(mesh);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const nextMats = mats.map((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (!std) return m;
          // Materials are authored in the model — keep every color/roughness as
          // exported. Only collect the glazing so it can light up at dusk.
          if (std.transparent) {
            // Glass: render after opaque walls/frames and read clearly against
            // the dark interior (authored 0.45 alpha vanished on screen).
            std.depthWrite = false;
            std.opacity = Math.max(std.opacity, 0.7);
            mesh.renderOrder = 10;
            if (!glassMats.includes(std)) glassMats.push(std);
          }
          // Frames: authored metalness 0.6 renders near-black with no environment
          // map to reflect, so the frames disappeared. Keep colour, tame metal.
          if (name === "WINDOWS" && !std.transparent && std.metalness > 0.3) {
            std.metalness = 0.25;
            std.roughness = Math.max(std.roughness, 0.45);
          }
          if (name !== "WALLS") return std;
          // Isolate the clipping plane from materials used by other parts.
          // Retain authored sidedness: rendering backfaces on this uncapped
          // mesh would make the inside of the open cut much more apparent.
          const wallMat = std.clone();
          wallMat.clippingPlanes = [wallClip];
          wallMat.clipShadows = true;
          wallMat.needsUpdate = true;
          return wallMat;
        });
        if (name === "WALLS") {
          mesh.material = Array.isArray(mesh.material) ? nextMats : nextMats[0];
        }
      });

      // Windows: recenter each pane's geometry on its own bounding-box center so
      // scaling reads as a pane popping open in place, not shrinking to a corner.
      if (name === "WINDOWS") {
        paneMeshes.forEach((mesh) => {
          const geo = mesh.geometry.clone();
          geo.computeBoundingBox();
          const c = new THREE.Vector3();
          geo.boundingBox?.getCenter(c);
          geo.translate(-c.x, -c.y, -c.z);
          mesh.geometry = geo;
          const offset = c
            .clone()
            .multiply(mesh.scale)
            .applyQuaternion(mesh.quaternion);
          mesh.position.add(offset);
          const world = mesh.getWorldPosition(new THREE.Vector3());
          panes.push({ mesh, rest: mesh.position.clone(), delay: world.x });
        });
        // Stagger left → right across the facade.
        const xs = panes.map((p) => p.delay);
        const min = xs.length ? Math.min(...xs) : 0;
        const span = xs.length ? Math.max(0.001, Math.max(...xs) - min) : 1;
        panes.forEach((p) => {
          p.delay = (p.delay - min) / span;
        });
      }

      if (meshCount === 0) {
        console.warn(`[AboutScene] node "${name}" has no drawable meshes`);
      }
      found.push({ name, node, restY: node.position.y });
    });

    return { root: cloned, parts: found, glassMats, riseLocal, wallClip, panes };
  }, [gltf.scene]);

  // Park every part out of frame and hide it on mount so there's no flash of
  // the finished building before the scroll story begins.
  useEffect(() => {
    parts.forEach((part) => {
      part.node.visible = false;
      if (part.name === "ROOF") part.node.position.y = part.restY + riseLocal * 0.9;
      else if (part.name !== "WALLS") part.node.position.y = part.restY - riseLocal;
    });
    wallClip.constant = 0;
    panes.forEach((p) => p.mesh.scale.setScalar(0.0001));
  }, [parts, riseLocal, wallClip, panes]);

  // The exported GLTF points its stone image at bufferView 0 (vertex data), so
  // the loader fails and the cladding renders untextured white. The real PNG
  // lives in bufferView 3 — extract it and attach it to the stone material.
  useEffect(() => {
    let cancelled = false;
    let tex: THREE.Texture | null = null;
    (async () => {
      try {
        const json = await (await fetch(modelUrl)).json();
        const bv = json.bufferViews.find(
          (v: { buffer: number; byteOffset?: number; target?: number }) =>
            v.buffer === 1 && !v.target,
        );
        if (!bv) return;
        const buf = await (await fetch(json.buffers[bv.buffer].uri)).arrayBuffer();
        const off = bv.byteOffset ?? 0;
        const blob = new Blob([buf.slice(off, off + bv.byteLength)], { type: "image/png" });
        const bmpUrl = URL.createObjectURL(blob);
        tex = await new THREE.TextureLoader().loadAsync(bmpUrl);
        URL.revokeObjectURL(bmpUrl);
        if (cancelled) return;
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (/stone|ashlar/i.test(std.name)) {
              std.map = tex;
              std.color.setRGB(1, 1, 1);
              std.needsUpdate = true;
            }
          });
        });
      } catch (e) {
        console.warn("[AboutScene] stone texture recovery failed", e);
      }
    })();
    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [root]);

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

    parts.forEach((part) => {
      const reveal = partReveal(p, PART_STAGE[part.name]);
      const ramp = partRamp(p, PART_STAGE[part.name]);

      switch (part.name) {
        case "FLOOR": {
          // Slab rises from below and lands with a slight overshoot/settle.
          const e = ramp <= 0 ? 0 : easeOutBack(ramp, 1.25);
          part.node.visible = ramp > 0.001;
          part.node.position.y = part.restY - riseLocal * (1 - e);
          break;
        }
        case "WALLS": {
          // No translation: the walls stay in their final position and a
          // horizontal clipping plane rises through them, so the mass builds
          // upward course by course.
          part.node.visible = ramp > 0.001;
          // World height of the wall top (base sits at y=0).
          wallClip.constant = buildingMetrics.height * 1.02 * smoothstep(ramp);
          break;
        }
        case "WINDOWS": {
          // Panes snap open left → right instead of rising.
          part.node.visible = ramp > 0.001;
          panes.forEach((pane) => {
            const local = (ramp - pane.delay * 0.45) / 0.55;
            // Lock to exactly 1 once installed so nothing ends undersized.
            const s =
              local >= 1 ? 1 : local <= 0 ? 0.0001 : Math.max(0.0001, easeSnap(local));
            pane.mesh.scale.setScalar(s);
            pane.mesh.position.copy(pane.rest);
          });
          break;
        }
        case "ROOF": {
          // Craned down from above, settling onto the walls with a small bounce.
          const e = ramp <= 0 ? 0 : easeOutBack(ramp, 1.5);
          part.node.visible = ramp > 0.001;
          part.node.position.y = part.restY + riseLocal * 0.9 * (1 - e);
          break;
        }
        default:
          part.node.visible = reveal > 0.001;
      }
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
      <ProceduralDoors />

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
useGLTF.preload(modelUrl);
