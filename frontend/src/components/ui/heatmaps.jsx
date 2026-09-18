import React, { useState, useMemo } from "react";

const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_HOURS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];

export function HeatmapChart({
  width = 800,
  height = 400,
  data = null,
  events = true,
  onCellClick = null,
  className = "",
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Generate realistic civic complaint density matrix if data is not provided
  const matrix = useMemo(() => {
    if (data && Array.isArray(data)) return data;
    const generated = [];
    DEFAULT_DAYS.forEach((day, dIdx) => {
      DEFAULT_HOURS.forEach((hour, hIdx) => {
        // Higher volume midday and weekdays
        const isPeak = dIdx < 5 && hIdx >= 2 && hIdx <= 4;
        const count = Math.floor(
          (isPeak ? 15 : 4) + Math.sin(dIdx * 1.5 + hIdx) * 6 + Math.random() * 8
        );
        generated.push({
          day,
          hour,
          value: Math.max(1, count),
          dIdx,
          hIdx,
        });
      });
    });
    return generated;
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(...matrix.map((m) => m.value), 1);
  }, [matrix]);

  const getColor = (value) => {
    const ratio = value / maxValue;
    if (ratio > 0.8) return "rgba(239, 68, 68, 0.9)";     // Red-500
    if (ratio > 0.6) return "rgba(249, 115, 22, 0.85)";   // Orange-500
    if (ratio > 0.4) return "rgba(245, 158, 11, 0.75)";   // Amber-500
    if (ratio > 0.2) return "rgba(59, 130, 246, 0.65)";   // Blue-500
    return "rgba(59, 130, 246, 0.25)";                     // Light blue
  };

  const cellWidth = Math.max(40, Math.floor((width - 80) / DEFAULT_HOURS.length));
  const cellHeight = Math.max(30, Math.floor((height - 70) / DEFAULT_DAYS.length));

  return (
    <div
      className={`relative rounded-xl border border-border bg-card p-6 shadow-sm overflow-x-auto ${className}`}
      style={{ maxWidth: width }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Complaint Incident Density Matrix</h3>
          <p className="text-xs text-ink-muted">Time-of-day vs day-of-week reporting frequency</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>Low</span>
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-500/30"></span>
            <span className="w-3 h-3 rounded-sm bg-blue-500/70"></span>
            <span className="w-3 h-3 rounded-sm bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-sm bg-orange-500/90"></span>
            <span className="w-3 h-3 rounded-sm bg-red-500/90"></span>
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Hour labels (X axis) */}
          {DEFAULT_HOURS.map((hour, i) => (
            <text
              key={hour}
              x={60 + i * cellWidth + cellWidth / 2}
              y={25}
              textAnchor="middle"
              className="text-[11px] fill-current text-ink-muted"
            >
              {hour}
            </text>
          ))}

          {/* Day labels (Y axis) */}
          {DEFAULT_DAYS.map((day, i) => (
            <text
              key={day}
              x={45}
              y={45 + i * cellHeight + cellHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[11px] font-medium fill-current text-ink-secondary"
            >
              {day}
            </text>
          ))}

          {/* Matrix Cells */}
          {matrix.map((cell, idx) => {
            const x = 60 + cell.hIdx * cellWidth;
            const y = 40 + cell.dIdx * cellHeight;
            const isHovered = hoveredCell === idx;

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={cellWidth - 4}
                  height={cellHeight - 4}
                  rx={4}
                  fill={getColor(cell.value)}
                  className={`transition-all duration-150 ${
                    events ? "cursor-pointer hover:stroke-white hover:stroke-2" : ""
                  }`}
                  onMouseEnter={() => events && setHoveredCell(idx)}
                  onMouseLeave={() => events && setHoveredCell(null)}
                  onClick={() => onCellClick && onCellClick(cell)}
                />
                <text
                  x={x + (cellWidth - 4) / 2}
                  y={y + (cellHeight - 4) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] font-mono fill-white pointer-events-none font-semibold opacity-80"
                >
                  {cell.value}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredCell !== null && (
          <div
            className="pointer-events-none absolute z-20 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-xs text-white shadow-xl"
            style={{
              left: 60 + matrix[hoveredCell].hIdx * cellWidth + 10,
              top: 40 + matrix[hoveredCell].dIdx * cellHeight - 30,
            }}
          >
            <div className="font-semibold">
              {matrix[hoveredCell].day} at {matrix[hoveredCell].hour}
            </div>
            <div className="text-gray-300">{matrix[hoveredCell].value} complaints reported</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HeatmapChart;
