import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";

/**
 * Lighting shifts from cool blueprint-blue in early stages to a warm
 * golden-hour key at the end. On mobile we drop the soft fill light and
 * use lower shadow-map resolution.
 */
export function Lighting({ mobile }: { mobile: boolean }) {
  const progress = useProgressRef();
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);

  useFrame(() => {
    const p = progress.current;
    // Warm-shift ramps up after stage 4 (roof on) and completes by stage 7.
    const warm = smoothstep(stageLocal(p, 5)) * 0.7 + smoothstep(stageLocal(p, 6)) * 0.3;
    if (keyRef.current) {
      const cool = new THREE.Color("#7ec8ff");
      const golden = new THREE.Color("#ffd39a");
      keyRef.current.color.copy(cool).lerp(golden, warm);
      keyRef.current.intensity = 0.8 + 0.6 * warm;
    }
    if (ambRef.current) {
      ambRef.current.intensity = 0.55 - 0.15 * warm;
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.55} color="#a8c8ff" />
      <directionalLight
        ref={keyRef}
        position={[10, 14, 6]}
        intensity={0.8}
        color="#7ec8ff"
        castShadow
        shadow-mapSize-width={mobile ? 512 : 1024}
        shadow-mapSize-height={mobile ? 512 : 1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
      />
      {!mobile && (
        <directionalLight
          ref={fillRef}
          position={[-8, 6, -6]}
          intensity={0.25}
          color="#6a8fff"
        />
      )}
    </>
  );
}
