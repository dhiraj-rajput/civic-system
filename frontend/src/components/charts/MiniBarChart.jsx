import React from 'react';

// data: array of {label, value, color?}
export default function MiniBarChart({ data = [], height = 120 }) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center text-[var(--text-muted)] text-sm border border-dashed border-[var(--border-default)] rounded-md bg-[var(--surface-muted)]"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1); // Avoid div by 0
  
  // A clean, high-contrast palette
  const getColor = (value) => {
    const ratio = value / maxVal;
    if (ratio > 0.75) return '#f59e0b'; // Amber / Gold
    if (ratio > 0.45) return '#d97706'; // Dark Amber
    if (ratio > 0.2) return '#64748b'; // Slate 500
    return '#94a3b8'; // Slate 400
  };

  const chartHeight = height - 40; // reserve 40px for labels

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-around h-full pt-4 w-full gap-2 px-2 pb-6 relative">
        {data.map((item, index) => {
          const barHeight = (item.value / maxVal) * chartHeight;
          const barColor = item.color || getColor(item.value);
          
          return (
            <div 
              key={index} 
              className="group flex flex-col items-center justify-end flex-1 relative min-w-[20px]"
            >
              {/* Value Tooltip / Label */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity z-10 pointer-events-none font-medium">
                {item.label}: {item.value}
              </div>
              
              {/* Value above bar (static) */}
              <span className="text-[11px] font-semibold text-ink-muted group-hover:text-ink mb-1 transition-colors">
                {item.value}
              </span>

              {/* Bar */}
              <div 
                className="w-full rounded-t-sm transition-all duration-500 ease-out origin-bottom animate-in slide-in-from-bottom-full group-hover:opacity-90"
                style={{ 
                  height: `${barHeight}px`, 
                  backgroundColor: barColor,
                  minHeight: item.value > 0 ? '4px' : '0'
                }}
              />
              
              {/* X Axis Label */}
              <span className="absolute -bottom-6 text-[11px] font-medium text-ink-secondary truncate w-full text-center capitalize" title={item.label}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
