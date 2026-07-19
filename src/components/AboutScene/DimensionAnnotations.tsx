import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useProgressRef } from "./progress";
import { smoothstep, stageLocal } from "./stages";

/**
 * Floating blueprint-style dimension labels. Fully faded out by the time
 * the roof arrives (stage 4) — they belong to the blueprint/framing phase.
 */
export function DimensionAnnotations() {
  const progress = useProgressRef();
  const l1 = useRef<HTMLDivElement | null>(null);
  const l2 = useRef<HTMLDivElement | null>(null);
  const l3 = useRef<HTMLDivElement | null>(null);

  useFrame(() => {
    const p = progress.current;
    const s0 = smoothstep(stageLocal(p, 0));
    // Fade fully out over stages 2→3 (framing → openings), gone by stage 3.
    const fadeOut = smoothstep(stageLocal(p, 2));
    const opacity = String(Math.max(0, s0 * (1 - fadeOut)));
    if (l1.current) l1.current.style.opacity = opacity;
    if (l2.current) l2.current.style.opacity = opacity;
    if (l3.current) l3.current.style.opacity = opacity;
  });

  const labelClass =
    "pointer-events-none whitespace-nowrap rounded border border-sky-400/50 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-200 backdrop-blur-sm";

  return (
    <group>
      <Html position={[0, 0.05, -4.5]} center>
        <div ref={l1} className={labelClass}>12.00 m</div>
      </Html>
      <Html position={[6.8, 0.05, 0]} center>
        <div ref={l2} className={labelClass}>8.00 m</div>
      </Html>
      <Html position={[0, 3.2, -4]} center>
        <div ref={l3} className={labelClass}>+3.00 m FFL</div>
      </Html>
    </group>
  );
}
