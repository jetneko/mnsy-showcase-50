import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";

/**
 * Light construction dust — visible during stages 1–4 (walls → roof), then
 * settles as the finish and landscape stages take over.
 */
export function DustParticles({ count = 120 }: { count?: number }) {
  const progress = useProgressRef();
  const ref = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      vel[i * 3] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 1] = 0.004 + Math.random() * 0.006;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    const geom = ref.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geom) return;
    const arr = (geom.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2];
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = 0;
    }
    (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const p = progress.current;
    // Peak around stages 1–3, fade out from stage 5 onward.
    const build = smoothstep(stageLocal(p, 1)) - smoothstep(stageLocal(p, 5));
    const mat = ref.current!.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, build) * 0.5;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#e8dfc9"
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
