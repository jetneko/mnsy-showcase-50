// Copy content for each of the 6 scroll-driven floor-rise stages.

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
    eyebrow: "02 · Ground Floor",
    title: "Foundations that hold.",
    body: "Slab, load-bearing walls, and public rooms set out by licensed engineers to millimeter tolerance.",
    stat: { value: 10, suffix: "+", label: "Years of experience" },
  },
  {
    index: 2,
    eyebrow: "03 · Second Floor",
    title: "Structure without shortcuts.",
    body: "Reinforced columns and beams rise floor by floor — sized for real-world loads and Philippine seismic code.",
    stat: { value: 0, label: "Compromises on structure" },
  },
  {
    index: 3,
    eyebrow: "04 · Third Floor",
    title: "Rooms placed with intent.",
    body: "Layouts, fenestration, and privacy coordinated with your architect from day one — light and air, floor by floor.",
    stat: { value: 50, suffix: "+", label: "Projects delivered" },
  },
  {
    index: 4,
    eyebrow: "05 · Fourth Floor",
    title: "Finishes worth touching.",
    body: "Stone, wood, and glass specified with the client, sourced through our supply chain, installed by our trades.",
  },
  {
    index: 5,
    eyebrow: "06 · Roof & Handover",
    title: "One team, first meeting to handover.",
    body: "Weather-tight roof, finished grounds, and one accountable partner from groundbreak to the day you get the keys.",
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
