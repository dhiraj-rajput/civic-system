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
  
  // A simple function to generate a color gradient from brand primary to lighter gray based on value
  const getColor = (value) => {
    const ratio = value / maxVal;
    if (ratio > 0.8) return 'var(--brand-primary)';
    if (ratio > 0.5) return 'var(--brand-primary-light)';
    if (ratio > 0.2) return 'var(--text-secondary)';
    return 'var(--text-muted)';
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
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[var(--surface-sidebar)] text-[var(--text-on-dark)] text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity z-10 pointer-events-none">
                {item.label}: {item.value}
              </div>
              
              {/* Value above bar (static) */}
              <span className="text-[10px] text-[var(--text-muted)] mb-1">
                {item.value}
              </span>

              {/* Bar */}
              <div 
                className="w-full rounded-t-sm transition-all duration-500 ease-out origin-bottom animate-in slide-in-from-bottom-full"
                style={{ 
                  height: `${barHeight}px`, 
                  backgroundColor: barColor,
                  minHeight: item.value > 0 ? '4px' : '0'
                }}
              />
              
              {/* X Axis Label */}
              <span className="absolute -bottom-6 text-[10px] text-[var(--text-secondary)] truncate w-full text-center" title={item.label}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
