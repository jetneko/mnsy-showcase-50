import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";
import {
  BUILDING_CENTER,
  BUILDING_SCALE,
  BUILDING_SIZE,
  buildingMetrics,
  floorBeat,
  SEAM_LEVELS,
} from "./building";
import modelAsset from "@/assets/mars_chua_floors_v2.gltf.asset.json";


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

  // Build a normalized scene: clone, drop the oversized site slab, center the
  // real building on the origin, scale it to fit, and collect handles to each
  // named floor node with its resting Y.
  const { root, floors, upAxis, riseLocal } = useMemo(() => {
    const cloned = gltf.scene.clone(true);

    // The v2 export separates the huge flat site plane into its own node.
    // It spans far beyond the building and would wreck both the framing and
    // the silhouette, so it's removed entirely — the scene already has its own
    // procedural ground plane.
    const site = cloned.getObjectByName("SiteGround");
    site?.parent?.remove(site);

    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // The GLTF is Y-up (measured height 14.15 m on the y axis), so no
    // orientation fix is needed and floors rise along local +Y.
    const upAxis: "y" | "z" = "y";

    // Use the MEASURED building box (see building.ts) rather than an
    // auto-computed Box3: the height-split floor nodes all share one position
    // accessor, so their reported bounds are the whole-site box.
    const scale = BUILDING_SCALE;
    cloned.scale.setScalar(scale);
    // Recenter the real building footprint on the origin, base at y = 0.
    cloned.position.set(
      -BUILDING_CENTER.x * scale,
      0,
      -BUILDING_CENTER.z * scale,
    );

    // Rise distance in the model's own (pre-scale) units.
    const riseLocal = BUILDING_SIZE.y;


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

          // Opaque by default: partially transparent multi-shell CAD geometry
          // sorts badly and reads as jagged shards mid-rise. Each floor now
          // slides in as a solid, complete piece.
          std.transparent = false;
          std.depthWrite = true;
          std.side = THREE.DoubleSide;
          std.metalness = 0;
          std.envMapIntensity = 1.0;


          switch (kind) {
            case "glass":
              std.color = new THREE.Color(COLOR_GLASS);
              std.roughness = 0.12;
              std.metalness = 0.35;
              std.envMapIntensity = 1.6;
              std.transparent = true;
              std.depthWrite = false;
              std.side = THREE.FrontSide;
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

  // Park every floor below ground and hide it on first mount so there's no
  // flash of the whole building before scroll begins.
  useEffect(() => {
    floors.forEach((f) => {
      f.node.visible = false;
      (f.node.position as unknown as Record<string, number>)[upAxis] =
        f.restY - riseLocal;
    });
  }, [floors, upAxis, riseLocal]);



  // Thin trim bands at each real slab elevation (2.95 / 6.35 / 9.35 m). These
  // stay visible once their floor has landed so the finished building still
  // reads as four stacked storeys in the final static hero frame.
  const seamDefs = useMemo(
    () =>
      SEAM_LEVELS.map((s) => ({
        stage: s.stage,
        y: s.fraction * buildingMetrics.height,
        // Slightly PROUD of the footprint so the band reads as a recessed
        // shadow/trim line from every angle instead of being swallowed by
        // coplanar wall faces.
        w: buildingMetrics.width * 1.012,
        d: buildingMetrics.depth * 1.012,
      })),
    // Recompute when the model (and thus metrics) changes.
    [floors],
  );

  const seamMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#20242b"),
        roughness: 0.9,
        metalness: 0.1,
        // Fully opaque: a transparent band sorted behind the opaque wall shells
        // was invisible in the final frame, which is why the mass read as one
        // merged volume.
        transparent: false,
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
      // Solid, opaque piece: it stays fully rendered and simply slides up into
      // place — no per-triangle fade that would read as jagged shards.
      f.node.visible = reveal > 0.001;
      (f.node.position as unknown as Record<string, number>)[upAxis] =
        f.restY - riseLocal * (1 - reveal);
    });


    // Seam bands appear with the floor that lands on them and then STAY —
    // they are what makes the finished mass read as four distinct storeys.
    if (seamsRef.current) {
      seamsRef.current.children.forEach((s, i) => {
        const { reveal } = floorBeat(p, seamDefs[i].stage);
        s.visible = reveal > 0.35;
      });
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
      {/* Sits just below the blueprint plan so it never occludes the drawing. */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry
          args={[buildingMetrics.width * 1.04, 0.1, buildingMetrics.depth * 1.06]}
        />
        <meshStandardMaterial color="#1e2530" roughness={1} />
      </mesh>


      {/* The real Mars Chua model, split by floor. */}
      <primitive object={root} />

      {/* Floor-line trim strips at each height-split seam. */}
      <group ref={seamsRef}>
        {seamDefs.map((s) => (
          <mesh key={s.stage} position={[0, s.y, 0]} material={seamMat} visible={false} castShadow>
            <boxGeometry args={[s.w, 0.12, s.d]} />
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
