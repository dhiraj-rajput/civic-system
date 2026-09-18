import React from "react";

export const TECH_STACK = [
  { id: "react", name: "React 19", category: "Frontend UI", short: "Re" },
  { id: "fastapi", name: "FastAPI", category: "Python Backend", short: "FA" },
  { id: "python", name: "Python 3.14", category: "Core Pipeline", short: "Py" },
  { id: "mongodb", name: "MongoDB 8.3", category: "Geospatial Database", short: "Mg" },
  { id: "garage", name: "Garage S3", category: "Media Storage", short: "S3" },
  { id: "docker", name: "Docker Compose", category: "Container Engine", short: "Dk" },
  { id: "tailwind", name: "Tailwind CSS v4", category: "Styling System", short: "Tw" },
  { id: "leaflet", name: "Leaflet GIS", category: "Interactive Maps", short: "Lf" },
  { id: "vite", name: "Vite", category: "Build Tool", short: "Vt" },
  { id: "bun", name: "Bun Runtime", category: "JavaScript Runtime", short: "Bn" },
  { id: "nyc311", name: "NYC 311", category: "Socrata Open Data", short: "311" },
];

export default function TechMarquee() {
  const marqueeItems = [...TECH_STACK, ...TECH_STACK];

  return (
    <div className="w-full overflow-hidden py-4 relative select-none bg-slate-50 dark:bg-[#0f0f12] border-y border-slate-200 dark:border-neutral-800">
      {/* Soft Light & Dark Fade Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 dark:from-[#0f0f12] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 dark:from-[#0f0f12] to-transparent z-10 pointer-events-none" />

      {/* Scrolling Track */}
      <div className="flex w-max animate-marquee gap-5 hover:[animation-play-state:paused]">
        {marqueeItems.map((tech, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] hover:border-slate-300 dark:hover:border-amber-400/50 hover:shadow-md transition-all shadow-sm shrink-0 cursor-default"
          >
            {/* PNG Placeholder with fallback monogram */}
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#222226] border border-slate-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={`/icons/tech/${tech.id}.png`}
                alt={tech.name}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = "flex";
                  }
                }}
              />
              <span className="hidden text-xs font-bold text-slate-700 dark:text-amber-400 uppercase font-mono">
                {tech.short}
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {tech.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-amber-400/80 font-medium">
                {tech.category}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
