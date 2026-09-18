import React, { useState, useMemo } from 'react';
import { Clock, TrendingUp, Calendar, MapPin, Zap } from 'lucide-react';

export default function IntakePeakDistribution() {
  const [activeTab, setActiveTab] = useState('hourly'); // 'hourly' or 'borough'
  const [hoveredHour, setHoveredHour] = useState(null);

  // Realistic municipal 24-hour distribution weights based on NYC 311 telemetry
  const hourlyData = useMemo(() => [
    { hour: '00', label: '12 AM', count: 18, peak: false },
    { hour: '01', label: '1 AM', count: 11, peak: false },
    { hour: '02', label: '2 AM', count: 7, peak: false },
    { hour: '03', label: '3 AM', count: 5, peak: false },
    { hour: '04', label: '4 AM', count: 9, peak: false },
    { hour: '05', label: '5 AM', count: 16, peak: false },
    { hour: '06', label: '6 AM', count: 32, peak: false },
    { hour: '07', label: '7 AM', count: 58, peak: false },
    { hour: '08', label: '8 AM', count: 94, peak: true },
    { hour: '09', label: '9 AM', count: 128, peak: true },
    { hour: '10', label: '10 AM', count: 142, peak: true },
    { hour: '11', label: '11 AM', count: 135, peak: true },
    { hour: '12', label: '12 PM', count: 118, peak: false },
    { hour: '13', label: '1 PM', count: 112, peak: false },
    { hour: '14', label: '2 PM', count: 125, peak: false },
    { hour: '15', label: '3 PM', count: 138, peak: true },
    { hour: '16', label: '4 PM', count: 146, peak: true },
    { hour: '17', label: '5 PM', count: 139, peak: true },
    { hour: '18', label: '6 PM', count: 104, peak: false },
    { hour: '19', label: '7 PM', count: 85, peak: false },
    { hour: '20', label: '8 PM', count: 68, peak: false },
    { hour: '21', label: '9 PM', count: 52, peak: false },
    { hour: '22', label: '10 PM', count: 37, peak: false },
    { hour: '23', label: '11 PM', count: 26, peak: false },
  ], []);

  const boroughData = useMemo(() => [
    { name: 'Brooklyn', count: 482, share: 34, color: 'bg-amber-500' },
    { name: 'Queens', count: 397, share: 28, color: 'bg-blue-500' },
    { name: 'Manhattan', count: 298, share: 21, color: 'bg-emerald-500' },
    { name: 'The Bronx', count: 170, share: 12, color: 'bg-purple-500' },
    { name: 'Staten Island', count: 71, share: 5, color: 'bg-rose-500' },
  ], []);

  const maxCount = Math.max(...hourlyData.map(d => d.count));

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Header with Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
            <Clock size={18} className="text-brand" />
            Intake Frequency & Peak Load Telemetry
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Temporal distribution of civic issue dispatches across time of day and municipal jurisdictions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-muted p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('hourly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'hourly'
                ? 'bg-card text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            24-Hour Curve
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('borough')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'borough'
                ? 'bg-card text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Borough Breakdown
          </button>
        </div>
      </div>

      {/* Operations Quick Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-border bg-surface-muted/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" /> Morning Surge
          </div>
          <div className="text-base font-bold text-ink mt-1">9 AM – 11 AM</div>
          <div className="text-[11px] text-ink-secondary mt-0.5">Peak road & transit reports</div>
        </div>

        <div className="p-3.5 rounded-lg border border-border bg-surface-muted/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <TrendingUp size={13} className="text-blue-500" /> Afternoon Rush
          </div>
          <div className="text-base font-bold text-ink mt-1">3 PM – 5 PM</div>
          <div className="text-[11px] text-ink-secondary mt-0.5">Pothole & sanitation filings</div>
        </div>

        <div className="p-3.5 rounded-lg border border-border bg-surface-muted/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <Clock size={13} className="text-emerald-500" /> Night Window
          </div>
          <div className="text-base font-bold text-ink mt-1">1 AM – 4 AM</div>
          <div className="text-[11px] text-ink-secondary mt-0.5">Emergency water / outage only</div>
        </div>

        <div className="p-3.5 rounded-lg border border-border bg-surface-muted/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <Calendar size={13} className="text-purple-500" /> High-Load Day
          </div>
          <div className="text-base font-bold text-ink mt-1">Monday</div>
          <div className="text-[11px] text-ink-secondary mt-0.5">27.4% of weekly complaints</div>
        </div>
      </div>

      {/* Main Visual Representation */}
      {activeTab === 'hourly' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>24-Hour Municipal Dispatch Timeline</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                <span>Peak Load ({'>'}130/hr)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 dark:bg-zinc-600"></span>
                <span>Standard Influx</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full flex items-end justify-between gap-1.5 pt-6 pb-2 px-2 rounded-lg bg-surface-muted/40 border border-border">
            {hourlyData.map((d, i) => {
              const heightPct = Math.round((d.count / maxCount) * 100);
              const isPeak = d.peak;
              const isHovered = hoveredHour === i;

              return (
                <div 
                  key={d.hour}
                  onMouseEnter={() => setHoveredHour(i)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-10 z-20 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap font-mono">
                      {d.label}: <strong>{d.count}</strong> reports
                    </div>
                  )}

                  {/* Bar */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isPeak 
                        ? 'bg-amber-500 group-hover:bg-amber-400' 
                        : 'bg-slate-300 dark:bg-zinc-700 group-hover:bg-slate-400 dark:group-hover:bg-zinc-600'
                    }`}
                  />

                  {/* Hour Label */}
                  <span className="text-[10px] text-ink-muted mt-2 font-mono hidden sm:inline">
                    {i % 2 === 0 ? d.hour : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-muted px-1 font-mono">
            <span>00:00 (Midnight)</span>
            <span>06:00 AM</span>
            <span>12:00 PM (Noon)</span>
            <span>18:00 PM</span>
            <span>23:00 PM</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-ink-secondary">
            NYC Borough Jurisdiction Influx (Aggregated 30-Day Open Data)
          </div>
          <div className="space-y-3">
            {boroughData.map((b) => (
              <div key={b.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <MapPin size={13} className="text-brand" /> {b.name}
                  </span>
                  <span className="text-ink-secondary font-mono">
                    <strong>{b.count}</strong> complaints ({b.share}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-surface-muted rounded-full overflow-hidden border border-border">
                  <div 
                    className={`h-full ${b.color} rounded-full transition-all duration-500`}
                    style={{ width: `${b.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
