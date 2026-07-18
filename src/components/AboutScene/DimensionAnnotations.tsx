import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";

/**
 * Floating blueprint-style dimension labels. Visible during blueprint +
 * framing stages (0–2), fade out once materials arrive.
 */
export function DimensionAnnotations() {
  const progress = useProgressRef();
  const groupRef = useRef<HTMLDivElement | null>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = progress.current;
    const s0 = smoothstep(stageLocal(p, 0));
    const s3 = smoothstep(stageLocal(p, 3));
    groupRef.current.style.opacity = String(Math.max(0, s0 - s3));
  });

  const labelClass =
    "pointer-events-none whitespace-nowrap rounded border border-sky-400/50 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-200 backdrop-blur-sm";

  return (
    <group>
      <Html position={[0, 0.05, -4.5]} center transform={false} distanceFactor={undefined}>
        <div ref={groupRef} className="flex flex-col items-center gap-1">
          <div className={labelClass}>12.00 m</div>
        </div>
      </Html>
      <Html position={[6.8, 0.05, 0]} center>
        <div className={labelClass}>8.00 m</div>
      </Html>
      <Html position={[0, 3.2, -4]} center>
        <div className={labelClass}>+3.00 m FFL</div>
      </Html>
    </group>
  );
}
