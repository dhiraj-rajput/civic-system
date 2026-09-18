import React from "react";

export function FloatingPathsBackground({ className = "", position = -1, children }) {
  // Generate smooth cubic bezier paths that gently float across the dark background
  const paths = [
    { d: "M-100,100 C150,200 350,-50 600,150 C850,350 1050,100 1300,200", stroke: "rgba(59, 130, 246, 0.25)", width: 1.5, delay: "0s" },
    { d: "M-50,250 C200,80 400,320 700,180 C950,50 1150,280 1400,160", stroke: "rgba(99, 102, 241, 0.2)", width: 1.5, delay: "1.5s" },
    { d: "M0,400 C250,250 450,450 800,300 C1000,180 1200,380 1450,260", stroke: "rgba(14, 165, 233, 0.25)", width: 2, delay: "3s" },
    { d: "M-150,50 C100,280 300,120 550,290 C800,450 1100,200 1350,350", stroke: "rgba(56, 189, 248, 0.15)", width: 1, delay: "4.5s" },
    { d: "M-80,320 C180,480 420,220 680,380 C920,520 1180,310 1420,440", stroke: "rgba(168, 85, 247, 0.18)", width: 1.5, delay: "2s" },
  ];

  return (
    <div className={`relative overflow-hidden bg-black text-white ${className}`}>
      {/* Background radial gradient spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: "radial-gradient(circle at 50% 30%, rgba(37, 99, 235, 0.22) 0%, rgba(15, 23, 42, 0) 70%)"
        }}
      />

      {/* SVG Floating Paths */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1200 600"
        fill="none"
        preserveAspectRatio="none"
        style={{ zIndex: position === -1 ? 0 : position }}
      >
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {paths.map((p, idx) => (
          <path
            key={idx}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.width}
            className="animate-pulse"
            style={{
              animationDuration: "6s",
              animationDelay: p.delay,
              animationIterationCount: "infinite",
              animationTimingFunction: "ease-in-out",
            }}
          />
        ))}
      </svg>

      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}

export default function FloatingPathsBackgroundExample() {
  return (
    <FloatingPathsBackground
      className="aspect-16/9 flex items-center justify-center"
      position={-1}
    >
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-white">Civic Portal Infrastructure</h2>
        <p className="text-sm text-gray-400 mt-2">Next-Generation Municipal Management</p>
      </div>
    </FloatingPathsBackground>
  );
}
