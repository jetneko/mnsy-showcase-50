// Copy content for each of the 8 scroll-driven construction stages.

export type Stage = {
  index: number;
  eyebrow: string;
  title: string;
  body: string;
  stat?: { value: number; suffix?: string; label: string };
};

export const STAGES: Stage[] = [
  {
    index: 0,
    eyebrow: "01 · Blueprint",
    title: "Precision from the first line.",
    body: "Every project begins with fixed-scope estimates and transparent timelines — a plan we defend at every meeting.",
    stat: { value: 100, suffix: "%", label: "Fixed-scope estimates" },
  },
  {
    index: 1,
    eyebrow: "02 · Foundation",
    title: "Foundations that hold.",
    body: "Slab and floor plates set out by licensed engineers to millimeter tolerance before a single wall goes up.",
    stat: { value: 10, suffix: "+", label: "Years of experience" },
  },
  {
    index: 2,
    eyebrow: "03 · Structure",
    title: "Columns and beams, no shortcuts.",
    body: "Reinforced columns run the full height of the building, tied by beams sized for real loads and Philippine seismic code.",
    stat: { value: 0, label: "Compromises on structure" },
  },
  {
    index: 3,
    eyebrow: "04 · Walls",
    title: "Rooms placed with intent.",
    body: "Layouts and privacy coordinated with your architect from day one, then built by our own masonry trades.",
    stat: { value: 50, suffix: "+", label: "Projects delivered" },
  },
  {
    index: 4,
    eyebrow: "05 · Windows",
    title: "Light, air, and a view.",
    body: "Dark aluminium frames and tinted glazing installed to spec — sealed, squared, and weather-tested.",
  },
  {
    index: 5,
    eyebrow: "06 · Roof",
    title: "Weather-tight, first try.",
    body: "The roof deck closes the structure, protecting every finish that follows through the rainy season.",
  },
  {
    index: 6,
    eyebrow: "07 · Finishes",
    title: "Finishes worth touching.",
    body: "Stone, render, and glass specified with the client, sourced through our supply chain, installed by our trades.",
    stat: { value: 100, suffix: "%", label: "In-house quality control" },
  },
  {
    index: 7,
    eyebrow: "08 · Handover",
    title: "One team, first meeting to handover.",
    body: "Finished grounds and one accountable partner from groundbreak to the day you get the keys.",
    stat: { value: 100, suffix: "%", label: "Client-focused delivery" },
  },
];

// Beat boundaries. Progress p in [0,1] maps to stage index floor(p * STAGE_COUNT).
export const STAGE_COUNT = STAGES.length;

export function stageLocal(p: number, index: number): number {
  const v = p * STAGE_COUNT - index;
  return Math.max(0, Math.min(1, v));
}

// Smoothstep for easing crossfades between stages.
export function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** Stage indices, named so timing logic doesn't rely on magic numbers. */
export const STAGE = {
  BLUEPRINT: 0,
  FLOOR: 1,
  SKELETON: 2,
  WALLS: 3,
  WINDOWS: 4,
  ROOF: 5,
  FINISH: 6,
  LANDSCAPE: 7,
} as const;
