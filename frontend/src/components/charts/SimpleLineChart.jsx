import React from 'react';

// data: [{date, filed, resolved}]
export default function SimpleLineChart({ data = [], height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center text-[var(--text-muted)] text-sm border border-dashed border-[var(--border-default)] rounded-md bg-[var(--surface-muted)]"
        style={{ height }}
      >
        No trend data
      </div>
    );
  }

  const paddingX = 40;
  const paddingY = 20;
  const graphWidth = 800; // viewBox width
  const graphHeight = height; 

  const maxVal = Math.max(...data.map(d => Math.max(d.filed || 0, d.resolved || 0)), 1);
  const minVal = 0;

  const getX = (index) => paddingX + (index * (graphWidth - 2 * paddingX) / (data.length - 1 || 1));
  const getY = (val) => graphHeight - paddingY - ((val - minVal) / (maxVal - minVal) * (graphHeight - 2 * paddingY));

  const filedPoints = data.map((d, i) => `${getX(i)},${getY(d.filed || 0)}`).join(' ');
  const resolvedPoints = data.map((d, i) => `${getX(i)},${getY(d.resolved || 0)}`).join(' ');

  return (
    <div className="w-full h-full flex flex-col relative" style={{ height: height + 40 }}>
      {/* Legend */}
      <div className="flex justify-end gap-4 mb-2 text-xs text-[var(--text-secondary)] px-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[var(--brand-primary)]"></div>
          Filed
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[var(--brand-success)]"></div>
          Resolved
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => (
            <line 
              key={i}
              x1={paddingX} y1={graphHeight - paddingY - (ratio * (graphHeight - 2 * paddingY))} 
              x2={graphWidth - paddingX} y2={graphHeight - paddingY - (ratio * (graphHeight - 2 * paddingY))} 
              stroke="var(--border-default)" strokeDasharray="4 4" strokeWidth="1"
            />
          ))}
          
          {/* Y Axis Labels */}
          {[0, 0.5, 1].map((ratio, i) => (
            <text 
              key={`y-${i}`}
              x={paddingX - 10} 
              y={graphHeight - paddingY - (ratio * (graphHeight - 2 * paddingY))} 
              fill="var(--text-muted)" fontSize="10" textAnchor="end" dominantBaseline="middle"
            >
              {Math.round(ratio * maxVal)}
            </text>
          ))}

          {/* Filed Line */}
          <polyline 
            fill="none" stroke="var(--brand-primary)" strokeWidth="2" 
            points={filedPoints} 
          />
          
          {/* Resolved Line */}
          <polyline 
            fill="none" stroke="var(--brand-success)" strokeWidth="2" 
            points={resolvedPoints} 
          />

          {/* Dots and Tooltips */}
          {data.map((d, i) => (
            <g key={i} className="group cursor-pointer">
              {/* Invisible larger circle for easier hovering */}
              <circle cx={getX(i)} cy={getY(d.filed || 0)} r="8" fill="transparent" />
              <circle cx={getX(i)} cy={getY(d.resolved || 0)} r="8" fill="transparent" />
              
              <circle cx={getX(i)} cy={getY(d.filed || 0)} r="3" fill="var(--surface-card)" stroke="var(--brand-primary)" strokeWidth="2" />
              <circle cx={getX(i)} cy={getY(d.resolved || 0)} r="3" fill="var(--surface-card)" stroke="var(--brand-success)" strokeWidth="2" />
              
              {/* X Axis Labels (every 5th day + first + last) */}
              {(i === 0 || i === data.length - 1 || i % 5 === 0) && (
                <text 
                  x={getX(i)} y={graphHeight - 4} 
                  fill="var(--text-muted)" fontSize="10" textAnchor="middle"
                >
                  {new Date(d.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                </text>
              )}
              
              {/* Tooltip background & text on hover (SVG native) */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                <rect 
                  x={Math.max(0, Math.min(graphWidth - 100, getX(i) - 50))} 
                  y={10} 
                  width="100" height="45" 
                  fill="var(--surface-sidebar)" rx="4"
                />
                <text x={Math.max(50, Math.min(graphWidth - 50, getX(i)))} y={25} fill="var(--text-on-dark)" fontSize="10" textAnchor="middle">
                  {new Date(d.date).toLocaleDateString()}
                </text>
                <text x={Math.max(50, Math.min(graphWidth - 50, getX(i)))} y={38} fill="var(--brand-primary-light)" fontSize="10" textAnchor="middle">
                  Filed: {d.filed} | <tspan fill="var(--brand-success)">Res: {d.resolved}</tspan>
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
