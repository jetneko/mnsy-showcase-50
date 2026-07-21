import { useEffect, useRef, useState } from "react";
import { STAGES, STAGE_COUNT } from "./stages";
import { Ruler, Building, Building2, Layers, Sparkles, KeyRound, type LucideIcon } from "lucide-react";
import type { ProgressRef } from "./progress";

const STAGE_ICONS: LucideIcon[] = [Ruler, Building, Building2, Layers, Sparkles, KeyRound];

/**
 * DOM overlay: current stage copy on the left, vertical stepper on the right.
 * Reads progress from a shared ref via rAF and only re-renders when the
 * active stage index changes — the number counter animates via ref, not state.
 */
export function Timeline({ progressRef }: { progressRef: ProgressRef }) {
  const [active, setActive] = useState(0);
  const numberRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = progressRef.current;
      const idx = Math.min(STAGE_COUNT - 1, Math.max(0, Math.floor(p * STAGE_COUNT)));
      setActive((prev) => (prev !== idx ? idx : prev));
      // Progress bar width
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      // Number counter (per-stage local progress → count up to target)
      const stage = STAGES[idx];
      if (numberRef.current && stage.stat) {
        const local = Math.max(0, Math.min(1, p * STAGE_COUNT - idx));
        const val = Math.round(stage.stat.value * local);
        numberRef.current.textContent = `${val}${stage.stat.suffix ?? ""}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);

  const stage = STAGES[active];
  const Icon = STAGE_ICONS[active];

  return (
    <>
      {/* Top progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] overflow-hidden bg-white/5">
        <div
          ref={barRef}
          className="h-full origin-left bg-gradient-to-r from-sky-400 via-primary to-secondary"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {/* Left copy panel */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-full items-center px-6 md:w-[55%] md:px-16 lg:w-[48%] lg:px-24">
        <div key={active} className="max-w-xl animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-sky-200 backdrop-blur-sm">
            <Icon className="h-3.5 w-3.5" />
            {stage.eyebrow}
          </div>
          <h2 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:text-5xl lg:text-6xl">
            {stage.title}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 md:text-lg">
            {stage.body}
          </p>
          {stage.stat && (
            <div className="mt-8 inline-flex items-baseline gap-4 rounded-lg border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-md">
              <span
                ref={numberRef}
                className="font-display text-4xl font-black tabular-nums text-secondary md:text-5xl"
              >
                0
              </span>
              <span className="text-xs uppercase tracking-widest text-white/60">
                {stage.stat.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right stepper */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden items-center pr-6 md:flex lg:pr-12">
        <ol className="flex flex-col gap-3">
          {STAGES.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (
              <li
                key={s.index}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isActive ? "opacity-100" : isDone ? "opacity-70" : "opacity-35"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all ${
                    isActive
                      ? "border-sky-300 bg-sky-400/20 text-sky-100 shadow-[0_0_18px_rgba(125,200,255,0.5)]"
                      : isDone
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                        : "border-white/20 text-white/50"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <span
                  className={`hidden text-xs uppercase tracking-[0.2em] transition-colors lg:inline-block ${
                    isActive ? "text-white" : "text-white/50"
                  }`}
                >
                  {s.eyebrow.split("·")[1]?.trim() ?? ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
