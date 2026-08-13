// Shared building metrics + per-floor timing helpers.
//
// HouseConstruction computes the real fitted bounding box of the GLTF once and
// publishes it here so the camera rig and the procedural structural skeleton
// can frame/derive themselves from the actual model instead of hardcoded
// ground-level assumptions.

import { smoothstep, stageLocal } from "./stages";

/** The building's longest horizontal span is fitted to this many scene units. */
export const TARGET_SPAN = 18;

/**
 * Real building bounds measured from the v2 GLTF, EXCLUDING the oversized
 * `SiteGround` slab (which otherwise skews the bounding box and throws the
 * camera's look-at target onto empty ground).
 *
 * The GLTF's own accessor min/max are shared across all floor nodes (the split
 * reuses one buffer), so an auto-computed Box3 is unreliable — these measured
 * numbers are the source of truth.
 */
export const BUILDING_BOX = {
  min: { x: 5.06, y: 0, z: -40.65 },
  max: { x: 34.74, y: 14.15, z: -16.82 },
} as const;

export const BUILDING_CENTER = { x: 19.9, y: 7.08, z: -28.7 } as const;

export const BUILDING_SIZE = {
  x: BUILDING_BOX.max.x - BUILDING_BOX.min.x, // ~29.68
  y: BUILDING_BOX.max.y - BUILDING_BOX.min.y, // ~14.15
  z: BUILDING_BOX.max.z - BUILDING_BOX.min.z, // ~23.83
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

/**
 * Derived directly from the measured building box, so the camera rig and the
 * structural skeleton are correct from the very first frame (no waiting on the
 * GLTF to load and publish metrics).
 */
export const buildingMetrics: BuildingMetrics = {
  height: BUILDING_SIZE.y * BUILDING_SCALE,
  width: BUILDING_SIZE.x * BUILDING_SCALE,
  depth: BUILDING_SIZE.z * BUILDING_SCALE,
  centerY: (BUILDING_SIZE.y * BUILDING_SCALE) / 2,
  radius:
    (Math.max(BUILDING_SIZE.x, BUILDING_SIZE.z) * BUILDING_SCALE) / 2,
};


/**
 * Slab elevations as fractions of total height, from the real elevations
 * detected in the model (0.00 / 3.25 / 6.23 / 9.34 / ~10.9 m of a 14.15 m
 * mass). Index matches stage - 1.
 */
export const FLOOR_FRACTIONS = [0, 0.23, 0.44, 0.66, 0.77] as const;

export function floorSlabY(index: number): number {
  const f = FLOOR_FRACTIONS[Math.min(index, FLOOR_FRACTIONS.length - 1)];
  return f * buildingMetrics.height;
}


function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** Timing windows inside a single floor stage. */
const SKELETON_END = 0.34; // skeleton beat is short and snappy
const REVEAL_START = 0.24; // real geometry starts before skeleton is gone
const REVEAL_END = 0.72; // settles fully, leaving a clear gap before the next stage

export type FloorBeat = {
  /** 0→1 columns rising. */
  columns: number;
  /** 0→1 beams spanning. */
  beams: number;
  /** 0→1 skeleton visibility (fades out as real geometry arrives). */
  skeleton: number;
  /** 0→1 real GLTF floor reveal (rise + fade), settles fully at 1. */
  reveal: number;
};

export function floorBeat(p: number, stageIndex: number): FloorBeat {
  const local = stageLocal(p, stageIndex);
  const columns = smoothstep(clamp01(local / (SKELETON_END * 0.6)));
  const beams = smoothstep(clamp01((local - SKELETON_END * 0.45) / (SKELETON_END * 0.55)));
  const reveal = smoothstep(clamp01((local - REVEAL_START) / (REVEAL_END - REVEAL_START)));
  const skeleton = Math.max(0, Math.min(columns, 1) * (1 - reveal));
  return { columns, beams, skeleton, reveal };
}
