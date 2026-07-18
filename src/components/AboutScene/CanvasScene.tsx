import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ProgressContext, type ProgressRef } from "./progress";
import { Blueprint } from "./Blueprint";
import { HouseConstruction } from "./HouseConstruction";
import { CameraRig } from "./CameraRig";
import { Lighting } from "./Lighting";
import { Effects } from "./Effects";
import { DustParticles } from "./DustParticles";
import { DimensionAnnotations } from "./DimensionAnnotations";

/**
 * The R3F scene root. Split into its own module so the entire three.js
 * bundle can be lazy-loaded — the rest of the landing page renders
 * without waiting for it.
 */
export default function CanvasScene({
  progressRef,
  mobile,
}: {
  progressRef: ProgressRef;
  mobile: boolean;
}) {
  return (
    <ProgressContext.Provider value={progressRef}>
      <Canvas
        shadows={!mobile}
        dpr={mobile ? [1, 1.25] : [1, 1.75]}
        camera={{ position: [0, 22, 0.01], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <color attach="background" args={["#05070d"]} />
        <fog attach="fog" args={["#05070d", 30, 90]} />
        <Suspense fallback={null}>
          <Lighting mobile={mobile} />
          <Blueprint />
          <HouseConstruction mobile={mobile} />
          {!mobile && <DustParticles count={mobile ? 40 : 120} />}
          {!mobile && <DimensionAnnotations />}
          <CameraRig mobile={mobile} />
          <Effects mobile={mobile} />
        </Suspense>
      </Canvas>
    </ProgressContext.Provider>
  );
}
