import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";
import { buildingMetrics } from "./building";
// Pre-processed (inverted, high-contrast) version of the real floor plan so the
// linework can be additively composited as glowing blueprint lines.
import floorplan from "@/assets/mars-chua-floorplan-glow.png.asset.json";

/**
 * Blueprint layer: the real Mars Chua floor plan laid flat on the ground with a
 * glowing blueprint treatment, over a wireframe grid backdrop.
 * Fades in during stage 0, dissolves out as the ground floor rises (stages 1–2).
 */
export function Blueprint() {
  const progress = useProgressRef();
  const planRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.Mesh>(null);

  const map = useTexture(floorplan.url);
  // Thin CAD linework minifies into near-invisibility at the top-down camera
  // height, so crank anisotropic filtering and keep mipmaps sharp.
  useMemo(() => {
    map.anisotropy = 16;
    map.minFilter = THREE.LinearFilter;
    map.generateMipmaps = false;
    map.needsUpdate = true;
  }, [map]);

  // Size the plan plane to the building's fitted footprint, padded a little so
  // the surrounding driveways/garden in the drawing stay visible.
  const [planW, planD] = useMemo(() => {
    const pad = 1.35;
    const w = buildingMetrics.width * pad;
    const d = buildingMetrics.depth * pad;
    // Preserve the image's own aspect so the drawing isn't stretched.
    const img = map.image as { width?: number; height?: number } | undefined;
    const aspect = img?.width && img?.height ? img.width / img.height : w / d;
    return aspect > w / d ? [w, w / aspect] : [d * aspect, d];
  }, [map]);

  useFrame(() => {
    const p = progress.current;
    const s0 = stageLocal(p, 0);
    const s1 = stageLocal(p, 1);
    const s2 = stageLocal(p, 2);
    // Visible through stages 0–1, dissolved by stage 2.
    // Fades in quickly at the top of stage 0 so the plan reads immediately,
    // stays through stage 1, and is dissolved by stage 2.
    const opacity =
      smoothstep(Math.min(1, s0 * 8)) *
      (1 - smoothstep(s2)) *
      (1 - 0.45 * smoothstep(s1));
    if (planRef.current) {
      (planRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
    if (gridRef.current) {
      const mat = gridRef.current.material as THREE.MeshBasicMaterial;
      // Blueprint grid dissolves into ground as construction progresses.
      mat.opacity = 0.35 * (1 - smoothstep(s2));
    }
  });

  return (
    <group>
      {/* Blueprint grid backdrop on the ground */}
      <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <planeGeometry args={[40, 40, 40, 40]} />
        <meshBasicMaterial color="#4aa3ff" transparent opacity={0.35} wireframe />
      </mesh>

      {/* The real floor plan drawing, tinted to read as glowing blueprint linework */}
      <mesh ref={planRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <planeGeometry args={[planW, planD]} />
        <meshBasicMaterial
          map={map}
          /* Over-bright tint: additive blending + toneMapped=false lets the
             glow push past 1.0 so the lines read against the dark ground. */
          color={new THREE.Color(1.1, 1.9, 3.0)}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
