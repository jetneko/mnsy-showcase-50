import { EffectComposer, Bloom, SSAO } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * Bloom + subtle SSAO on desktop; nothing on mobile. No DOF — too expensive
 * for the payoff on this content.
 */
export function Effects({ mobile }: { mobile: boolean }) {
  if (mobile) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={16}
        radius={0.08}
        intensity={18}
        luminanceInfluence={0.5}
        color={undefined as unknown as THREE.Color}
        worldDistanceThreshold={20}
        worldDistanceFalloff={5}
        worldProximityThreshold={6}
        worldProximityFalloff={2}
      />
    </EffectComposer>
  );
}
