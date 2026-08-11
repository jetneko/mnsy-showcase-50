// Shared building metrics + per-floor timing helpers.
//
// HouseConstruction computes the real fitted bounding box of the GLTF once and
// publishes it here so the camera rig and the procedural structural skeleton
// can frame/derive themselves from the actual model instead of hardcoded
// ground-level assumptions.

import { smoothstep, stageLocal } from "./stages";

/** The building's longest horizontal span is fitted to this many scene units. */
export const TARGET_SPAN = 18;

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
  height: 6.5,
  width: TARGET_SPAN,
  depth: TARGET_SPAN * 0.5,
  centerY: 3.25,
  radius: TARGET_SPAN / 2,
};


/**
 * Approximate slab elevations as fractions of total height, derived from the
 * real elevations detected in the model (0.00 / 3.25 / 6.23 / 9.34 / ~10.9 m
 * of a ~13 m mass). Index matches stage - 1.
 */
export const FLOOR_FRACTIONS = [0, 0.25, 0.48, 0.72, 0.84] as const;

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
const REVEAL_END = 0.78; // and fully settles well before the next stage

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
