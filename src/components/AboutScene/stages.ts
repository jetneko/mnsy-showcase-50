// Copy content for each of the 8 scroll-driven construction stages.
// Repurposes the checklist that used to live in the old About Us section.

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
    eyebrow: "02 · Walls",
    title: "Foundations that hold.",
    body: "Load-bearing walls set out by licensed engineers to millimeter tolerance — nothing left to on-site guesswork.",
    stat: { value: 10, suffix: "+", label: "Years of experience" },
  },
  {
    index: 2,
    eyebrow: "03 · Structure",
    title: "Structure without shortcuts.",
    body: "Reinforced columns and steel beams sized for real-world loads and Philippine seismic code.",
    stat: { value: 0, label: "Compromises on structure" },
  },
  {
    index: 3,
    eyebrow: "04 · Openings",
    title: "Windows placed with intent.",
    body: "Fenestration planned for light, ventilation, and privacy — coordinated with your architect from day one.",
    stat: { value: 50, suffix: "+", label: "Projects delivered" },
  },
  {
    index: 4,
    eyebrow: "05 · Roof",
    title: "Sealed against everything above.",
    body: "Weather-tight roofing systems audited at every layer, from framing to flashing.",
  },
  {
    index: 5,
    eyebrow: "06 · Materials",
    title: "Finishes worth touching.",
    body: "Stone, wood, and glass specified with the client, sourced through our supply chain, installed by our trades.",
  },
  {
    index: 6,
    eyebrow: "07 · Site",
    title: "The site as part of the design.",
    body: "Grounds, driveways, and gardens shaped so the house belongs to its lot from day one.",
  },
  {
    index: 7,
    eyebrow: "08 · Handover",
    title: "One team, first meeting to handover.",
    body: "Direct communication and one accountable partner from groundbreak to the day you get the keys.",
    stat: { value: 100, suffix: "%", label: "Client-focused delivery" },
  },
];

// Beat boundaries. Progress p in [0,1] maps to stage index floor(p * 8).
// Each stage's local progress = (p*8) - stageIndex, clamped to [0,1].
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
