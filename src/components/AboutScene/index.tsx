import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Timeline } from "./Timeline";
import { useIsMobile } from "./useIsMobile";
import type { ProgressRef } from "./progress";
import { STAGE_COUNT } from "./stages";

// Lazy-load the whole three.js bundle so the landing hero isn't blocked.
const CanvasScene = lazy(() => import("./CanvasScene"));

/**
 * Public entry for the scroll-driven About Us experience.
 *
 * Layout: the outer <section> is tall (STAGE_COUNT × 100vh) so scrolling
 * through it advances progress. Inside, a `sticky` viewport-sized wrapper
 * pins the 3D scene and copy for the duration of the section.
 *
 * Progress (0..1) is stored on a ref that mutates on scroll. R3F meshes
 * read it inside useFrame; DOM (Timeline) reads it in rAF and only
 * re-renders on stage transitions. No per-frame setState anywhere.
 */
export function AboutScene() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<number>(0) as ProgressRef;
  const [hydrated, setHydrated] = useState(false);
  const [inView, setInView] = useState(false);
  const mobile = useIsMobile();

  // Client-only mount gate — three.js has no SSR representation.
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Only mount the Canvas once the section approaches the viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(true);
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scroll → progress. Uses rAF throttling to keep it 60fps friendly.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    let pending = false;
    const update = () => {
      pending = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      // start=0 when section top hits viewport top; end=1 when we've scrolled its full extra height
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / Math.max(1, total)));
      progressRef.current = p;
    };
    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      aria-label="How MNSY builds — an animated construction story"
      className="relative bg-brand-navy-deep"
      style={{ height: `${STAGE_COUNT * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D scene, absolutely positioned to fill the sticky viewport */}
        <div className="absolute inset-0">
          {hydrated && inView && (
            <Suspense fallback={<SceneFallback />}>
              <CanvasScene progressRef={progressRef} mobile={mobile} />
            </Suspense>
          )}
          {(!hydrated || !inView) && <SceneFallback />}
        </div>

        {/* Vignette so foreground copy always reads over the 3D content */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-navy-deep/85 via-brand-navy-deep/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-navy-deep to-transparent" />

        {/* DOM overlay: copy + stepper */}
        <Timeline progressRef={progressRef} />
      </div>
    </section>
  );
}

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-navy-deep">
      <div className="flex items-center gap-3 text-sky-300/70">
        <div className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
        <span className="font-mono text-xs uppercase tracking-[0.3em]">
          Loading blueprint…
        </span>
      </div>
    </div>
  );
}
