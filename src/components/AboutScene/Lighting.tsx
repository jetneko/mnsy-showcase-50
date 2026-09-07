import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal, STAGE } from "./stages";

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
    // Warm-shift starts as the roof closes (stage 6 of 8) and completes over
    // the exterior-finish beat (STAGE.FINISH), then holds for handover.
    const warm =
      smoothstep(stageLocal(p, STAGE.ROOF)) * 0.3 +
      smoothstep(stageLocal(p, STAGE.FINISH)) * 0.7;
    if (keyRef.current) {
      const cool = new THREE.Color("#7ec8ff");
      const golden = new THREE.Color("#ffd39a");
      keyRef.current.color.copy(cool).lerp(golden, warm);
      keyRef.current.intensity = 1.5 + 0.9 * warm;
    }
    if (ambRef.current) {
      ambRef.current.intensity = 0.75 - 0.1 * warm;
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.75} color="#a8c8ff" />
      <directionalLight
        ref={keyRef}
        position={[10, 14, 6]}
        intensity={1.5}
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
          intensity={0.45}
          color="#6a8fff"
        />
      )}
    </>
  );
}
