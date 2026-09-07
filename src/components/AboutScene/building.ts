// Shared building metrics + scroll-beat timing helpers.
//
// The model (mars_chua_parts.gltf) ships four genuinely separate named nodes —
// FLOOR, WALLS, ROOF, WINDOWS — so the numbers below are measured directly from
// those nodes' combined bounding box rather than approximated.

import { smoothstep, stageLocal } from "./stages";

/** The building's longest horizontal span is fitted to this many scene units. */
export const TARGET_SPAN = 18;

/**
 * Combined bounding box of FLOOR + WALLS + ROOF + WINDOWS, measured from the
 * parts GLTF's position accessors.
 */
export const BUILDING_BOX = {
  min: { x: 6.58, y: 0, z: -39.97 },
  max: { x: 36.43, y: 14.15, z: -13.56 },
} as const;

/** True center of the combined mass — the camera's look-at anchor. */
export const BUILDING_CENTER = { x: 21.5, y: 7.08, z: -26.77 } as const;

export const BUILDING_SIZE = {
  x: BUILDING_BOX.max.x - BUILDING_BOX.min.x, // ~29.85
  y: BUILDING_BOX.max.y - BUILDING_BOX.min.y, // ~14.15
  z: BUILDING_BOX.max.z - BUILDING_BOX.min.z, // ~26.41
} as const;

/** Uniform scale that fits the real footprint into the rig's TARGET_SPAN. */
export const BUILDING_SCALE =
  TARGET_SPAN / Math.max(BUILDING_SIZE.x, BUILDING_SIZE.z);

export type BuildingMetrics = {
  /** Fitted height in scene units (base at y=0). */
  height: number;
  /** Footprint width (x) in scene units. */
  width: number;
  /** Footprint depth (z) in scene units. */
  depth: number;
  /** Vertical center of the mass — the natural look-at height. */
  centerY: number;
  /** Half the longest horizontal span — the camera's distance unit. */
  radius: number;
};

export const buildingMetrics: BuildingMetrics = {
  height: BUILDING_SIZE.y * BUILDING_SCALE,
  width: BUILDING_SIZE.x * BUILDING_SCALE,
  depth: BUILDING_SIZE.z * BUILDING_SCALE,
  centerY: (BUILDING_SIZE.y * BUILDING_SCALE) / 2,
  radius: (Math.max(BUILDING_SIZE.x, BUILDING_SIZE.z) * BUILDING_SCALE) / 2,
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Reveal curve for a whole model part (FLOOR / WALLS / WINDOWS / ROOF).
 * Returns 0→1 over the first ~72% of its stage, so the piece is fully landed
 * and locked before the next beat starts. The part is always drawn opaque and
 * complete — only its position animates — so there is never any per-triangle
 * fade or jagged partial geometry.
 */
const REVEAL_START = 0.06;
const REVEAL_END = 0.72;

export function partReveal(p: number, stageIndex: number): number {
  const local = stageLocal(p, stageIndex);
  return smoothstep(clamp01((local - REVEAL_START) / (REVEAL_END - REVEAL_START)));
}

/** Raw 0→1 ramp for a stage, without the smoothstep easing. */
export function partRamp(p: number, stageIndex: number): number {
  const local = stageLocal(p, stageIndex);
  return clamp01((local - REVEAL_START) / (REVEAL_END - REVEAL_START));
}

/** Overshoot-and-settle ease — gives a heavy piece weight on landing. */
export function easeOutBack(x: number, overshoot = 1.35): number {
  const t = clamp01(x) - 1;
  const c = overshoot;
  return 1 + (c + 1) * t * t * t + c * t * t;
}

/** Quick snap with a small overshoot — used for window panes clicking in. */
export function easeSnap(x: number): number {
  return easeOutBack(x, 1.9);
}

export type SkeletonBeat = {
  /** 0→1 columns rising from the ground to the roof line. */
  columns: number;
  /** 0→1 beams spanning across the column tops. */
  beams: number;
  /** 0→1 overall skeleton visibility (fades as the walls arrive). */
  opacity: number;
};

/**
 * Single full-height structural pass: columns rise ground→roof through the
 * first half of the skeleton stage, beams span at the top, then the whole
 * skeleton fades out as the WALLS mass rises in the following stage.
 */
export function skeletonBeat(
  p: number,
  skeletonStage: number,
  wallsStage: number,
): SkeletonBeat {
  const local = stageLocal(p, skeletonStage);
  const columns = smoothstep(clamp01(local / 0.55));
  const beams = smoothstep(clamp01((local - 0.5) / 0.35));
  const fadeIn = smoothstep(clamp01(local / 0.18));
  const wallsIn = partReveal(p, wallsStage);
  const opacity = clamp01(fadeIn * (1 - wallsIn));
  return { columns, beams, opacity };
}
