import React, { useState } from 'react';

// data: [{date, filed, resolved}]
export default function SimpleLineChart({ data = [], height = 220 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center text-[var(--text-muted)] text-sm border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--surface-muted)]"
        style={{ height }}
      >
        No trend data available
      </div>
    );
  }

  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 20;
  const paddingBottom = 30;
  const graphWidth = 800; 
  const graphHeight = height; 

  const maxVal = Math.max(...data.map(d => Math.max(d.filed || 0, d.resolved || 0)), 1);
  const minVal = 0;

  const usableWidth = graphWidth - paddingLeft - paddingRight;
  const usableHeight = graphHeight - paddingTop - paddingBottom;

  const getX = (index) => paddingLeft + (index * usableWidth / Math.max(data.length - 1, 1));
  const getY = (val) => graphHeight - paddingBottom - ((val - minVal) / (maxVal - minVal) * usableHeight);

  const filedPoints = data.map((d, i) => `${getX(i)},${getY(d.filed || 0)}`).join(' ');
  const resolvedPoints = data.map((d, i) => `${getX(i)},${getY(d.resolved || 0)}`).join(' ');

  // Area under the filed curve
  const areaPoints = `${getX(0)},${graphHeight - paddingBottom} ${filedPoints} ${getX(data.length - 1)},${graphHeight - paddingBottom}`;

  return (
    <div className="w-full flex flex-col relative select-none overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-sm">
      {/* Header & Legend */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-medium text-[var(--text-secondary)]">30-Day Activity</span>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {data.length} recorded daily intervals
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            <span>Filed Issues</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span>Resolved</span>
          </div>
        </div>
      </div>

      {/* Responsive Chart Viewport with Strict Bounding */}
      <div className="w-full relative overflow-hidden rounded-lg bg-[var(--surface-muted)]" style={{ height }}>
        <svg 
          viewBox={`0 0 ${graphWidth} ${graphHeight}`} 
          className="w-full h-full block" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="filedAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="filedStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="resolvedStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const yPos = graphHeight - paddingBottom - (ratio * usableHeight);
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={yPos} 
                  x2={graphWidth - paddingRight} 
                  y2={yPos} 
                  stroke="var(--border-default)" 
                  strokeDasharray="4 4" 
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
                <text 
                  x={paddingLeft - 10} 
                  y={yPos} 
                  fill="var(--text-muted)" 
                  fontSize="11" 
                  fontFamily="monospace"
                  textAnchor="end" 
                  dominantBaseline="middle"
                >
                  {Math.round(ratio * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polygon points={areaPoints} fill="url(#filedAreaGrad)" />

          {/* Filed Polyline */}
          <polyline 
            fill="none" 
            stroke="url(#filedStroke)" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
            points={filedPoints} 
          />
          
          {/* Resolved Polyline */}
          <polyline 
            fill="none" 
            stroke="url(#resolvedStroke)" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
            points={resolvedPoints} 
          />

          {/* Data Points and Interactivity */}
          {data.map((d, i) => {
            const x = getX(i);
            const yFiled = getY(d.filed || 0);
            const yRes = getY(d.resolved || 0);
            const isHovered = hoveredIdx === i;

            // Show dates every 5-6 days, plus first and last
            const showDate = i === 0 || i === data.length - 1 || i % Math.max(1, Math.floor(data.length / 5)) === 0;

            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Vertical hover indicator line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={graphHeight - paddingBottom}
                    stroke="var(--brand-primary-light)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* X Axis Date Label */}
                {showDate && (
                  <text 
                    x={x} 
                    y={graphHeight - 8} 
                    fill="var(--text-muted)" 
                    fontSize="10" 
                    textAnchor="middle"
                    className="select-none"
                  >
                    {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </text>
                )}

                {/* Invisible hover trigger column */}
                <rect 
                  x={x - usableWidth / (data.length * 2)} 
                  y={paddingTop} 
                  width={usableWidth / data.length} 
                  height={usableHeight} 
                  fill="transparent" 
                />

                {/* Dot for Filed */}
                <circle 
                  cx={x} 
                  cy={yFiled} 
                  r={isHovered ? "5" : "3"} 
                  fill="var(--surface-card)" 
                  stroke="#3b82f6" 
                  strokeWidth={isHovered ? "2.5" : "1.5"} 
                />

                {/* Dot for Resolved */}
                <circle 
                  cx={x} 
                  cy={yRes} 
                  r={isHovered ? "5" : "3"} 
                  fill="var(--surface-card)" 
                  stroke="#10b981" 
                  strokeWidth={isHovered ? "2.5" : "1.5"} 
                />
              </g>
            );
          })}

          {/* Bound-checked Hover Tooltip */}
          {hoveredIdx !== null && data[hoveredIdx] && (
            (() => {
              const d = data[hoveredIdx];
              const x = getX(hoveredIdx);
              const tooltipWidth = 120;
              const tooltipHeight = 46;
              const tooltipX = Math.max(paddingLeft, Math.min(graphWidth - paddingRight - tooltipWidth, x - tooltipWidth / 2));
              const tooltipY = Math.max(10, Math.min(graphHeight - paddingBottom - tooltipHeight - 10, getY(Math.max(d.filed || 0, d.resolved || 0)) - tooltipHeight - 8));

              return (
                <g className="pointer-events-none transition-all duration-150">
                  <rect 
                    x={tooltipX} 
                    y={tooltipY} 
                    width={tooltipWidth} 
                    height={tooltipHeight} 
                    fill="#0f172a" 
                    stroke="#334155" 
                    strokeWidth="1"
                    rx="6"
                    className="shadow-xl"
                  />
                  <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 16} fill="#94a3b8" fontSize="10" fontWeight="500" textAnchor="middle">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </text>
                  <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 34} fontSize="11" fontWeight="600" textAnchor="middle">
                    <tspan fill="#60a5fa">Filed: {d.filed || 0}</tspan>
                    <tspan fill="#94a3b8">  |  </tspan>
                    <tspan fill="#34d399">Done: {d.resolved || 0}</tspan>
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>
    </div>
  );
}
