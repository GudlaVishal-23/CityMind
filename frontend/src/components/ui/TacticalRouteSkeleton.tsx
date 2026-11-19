import React from 'react';

/**
 * TacticalRouteSkeleton — Zero-CLS Dark Tactical Operations OS Page Placeholder
 * Matches layout grid and elevation tokens of AI CITY command consoles.
 */
export const TacticalRouteSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading Operations Module"
      className="min-h-screen bg-slate-950 p-6 flex flex-col gap-6 text-slate-100 font-sans"
    >
      {/* Glassmorphic Top Status Bar Shimmer */}
      <div className="h-14 w-full rounded-xl bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] px-6 flex items-center justify-between animate-pulse shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-cyan-500/20" />
          <div className="h-4 w-36 rounded bg-slate-800" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-slate-800 hidden sm:block" />
          <div className="h-8 w-20 rounded-lg bg-slate-800" />
        </div>
      </div>

      {/* Responsive 4-Card Bento Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-32 rounded-xl bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] p-5 flex flex-col justify-between animate-pulse shadow-xl"
          >
            <div className="flex justify-between items-start">
              <div className="h-3.5 w-24 rounded bg-slate-800" />
              <div className="h-4 w-12 rounded-full bg-cyan-500/10" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="h-7 w-16 rounded bg-slate-800 font-mono" />
              <div className="h-3 w-20 rounded bg-slate-850" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Operations Canvas Skeleton (Split Map / Telemetry Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[460px]">
        {/* Left Primary View (Map or Intake Stream) */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col gap-4 animate-pulse shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="h-5 w-48 rounded bg-slate-800" />
            <div className="h-7 w-28 rounded-lg bg-slate-800/80" />
          </div>
          <div className="flex-1 w-full rounded-lg bg-slate-950/60 border border-white/[0.04] flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          </div>
        </div>

        {/* Right Secondary Panel (Telemetry / Queue) */}
        <div className="rounded-xl bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col gap-4 animate-pulse shadow-2xl">
          <div className="h-5 w-32 rounded bg-slate-800 pb-2 border-b border-white/[0.06]" />
          <div className="flex flex-col gap-3 flex-1 pt-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-16 w-full rounded-lg bg-slate-850/80 p-3 flex flex-col justify-between">
                <div className="h-3 w-3/4 rounded bg-slate-800" />
                <div className="flex justify-between">
                  <div className="h-2.5 w-16 rounded bg-slate-800 font-mono" />
                  <div className="h-2.5 w-12 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading AI CITY Tactical Operations Console...</span>
    </div>
  );
};

export default TacticalRouteSkeleton;
