import { useEffect, useState, useCallback } from "react";
import { BarChart3, Clock, AlertTriangle, RefreshCw, Map, Calendar } from "lucide-react";

import { api } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.jsx";
import Panel from "../../components/ui/Panel.jsx";
import MiniBarChart from "../../components/charts/MiniBarChart.jsx";
import SimpleLineChart from "../../components/charts/SimpleLineChart.jsx";
import { PriorityBadge } from "../../components/Badges.jsx";
import Button from "../../components/ui/Button.jsx";
import CivicHeatmap from "../../components/CivicHeatmap.jsx";
import { HeatmapChart } from "../../components/ui/heatmaps.jsx";

export default function Analytics() {
  const { toast } = useToast();
  
  const [summary, setSummary] = useState(null);
  const [sla, setSla] = useState(null);
  const [trend, setTrend] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [aging, setAging] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const [slaThreshold, setSlaThreshold] = useState("72");
  const [trendToggle, setTrendToggle] = useState("Both"); // Filed, Resolved, Both

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumData, slaData, trendData, hotData, agingData] = await Promise.all([
        api.get("/analytics/summary"),
        api.get(`/analytics/sla?sla_hours=${slaThreshold}`),
        api.get("/analytics/trend?days=30"),
        api.get("/analytics/hotspots"),
        api.get(`/analytics/aging?sla_hours=${slaThreshold}`)
      ]);
      setSummary(sumData);
      setSla(slaData);
      setTrend(trendData);
      setHotspots(hotData);
      setAging(agingData);
      setLastUpdated(new Date());
    } catch (e) {
      toast.error(e.detail || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [slaThreshold, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // SLA Circle Math (Radius = 45, Circumference = 282.7)
  const compliancePercent = sla ? Math.round(sla.sla_compliance_pct || 0) : 0;
  let slaColor = "var(--brand-danger)";
  if (compliancePercent > 80) slaColor = "var(--brand-success)";
  else if (compliancePercent >= 60) slaColor = "var(--brand-warning)";
  
  const dashArray = `${compliancePercent * 2.827} 282.7`;

  // Chart Transforms
  const statusData = summary?.by_status?.map(item => ({ label: item._id, value: item.count })) || [];
  const priorityData = summary?.by_priority?.map(item => ({ label: item._id, value: item.count })) || [];
  
  // Filter trend based on toggle
  const filteredTrend = trend.map(d => ({
    date: d.date,
    filed: trendToggle === "Resolved" ? 0 : d.filed,
    resolved: trendToggle === "Filed" ? 0 : d.resolved
  }));

  const getRelativeTimeMinutes = () => {
    const diff = Math.floor((new Date() - lastUpdated) / 60000);
    if (diff === 0) return 'Just now';
    return `${diff} min ago`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BarChart3 size={24} className="text-[var(--brand-primary)]" />
          Analytics & Insights
        </h1>
        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
          Last updated: {getRelativeTimeMinutes()}
          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2. SLA Performance Section */}
      <Panel className="p-6">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-default)" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" 
                  stroke={slaColor} strokeWidth="8" 
                  strokeDasharray={dashArray} strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: slaColor }}>{compliancePercent}%</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">SLA Compliance</h2>
              <div className="text-sm text-[var(--text-secondary)]">Target resolution within selected timeframe</div>
              <div className="mt-2 flex gap-2">
                {[48, 72, 96].map(hours => (
                  <button
                    key={hours}
                    onClick={() => setSlaThreshold(hours.toString())}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${slaThreshold === hours.toString() ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' : 'bg-[var(--surface-input)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--brand-primary)]'}`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1 w-full md:pl-8 md:border-l border-[var(--border-default)]">
            <div>
              <div className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-1"><Clock size={14} /> Avg Resolution</div>
              <div className="text-2xl font-semibold mt-1 text-[var(--text-primary)]">{sla?.avg_resolution_hours ? Math.round(sla.avg_resolution_hours) : "—"} <span className="text-sm text-[var(--text-muted)] font-normal">hrs</span></div>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-1">Within SLA</div>
              <div className="text-2xl font-semibold mt-1 text-[var(--brand-success)]">{sla?.resolved_within_sla ?? 0}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-1">Breaching Now</div>
              <div className="text-2xl font-semibold mt-1 text-[var(--brand-danger)]">{sla?.breaching_sla_now ?? 0}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-1">Open Count</div>
              <div className="text-2xl font-semibold mt-1 text-[var(--text-primary)]">{sla?.open_count ?? 0}</div>
            </div>
          </div>
          
        </div>
      </Panel>

      {/* 3. Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel className="p-4 flex flex-col">
          <h2 className="text-sm font-semibold mb-6 text-[var(--text-primary)]">Status Distribution</h2>
          <div className="flex-1">
            <MiniBarChart data={statusData} />
          </div>
        </Panel>
        <Panel className="p-4 flex flex-col">
          <h2 className="text-sm font-semibold mb-6 text-[var(--text-primary)]">Priority Distribution</h2>
          <div className="flex-1">
            <MiniBarChart data={priorityData} />
          </div>
        </Panel>
      </div>

      {/* 4. Trend chart */}
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">30-Day Trend</h2>
          <div className="flex bg-[var(--surface-input)] rounded-md border border-[var(--border-default)] p-1">
            {["Filed", "Resolved", "Both"].map(opt => (
              <button 
                key={opt}
                onClick={() => setTrendToggle(opt)}
                className={`px-3 py-1 text-xs rounded transition-colors ${trendToggle === opt ? 'bg-[var(--surface-card)] shadow-sm text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <SimpleLineChart data={filteredTrend} />
      </Panel>

      {/* 5. Geospatial Civic Heatmap */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Map size={20} className="text-[var(--brand-primary)]" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Geospatial Incident Heatmap</h2>
        </div>
        <CivicHeatmap />
      </div>

      {/* 6. Hourly Density Matrix Heatmap */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={20} className="text-[var(--brand-primary)]" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Intake Frequency Density Matrix (Day vs Hour)</h2>
        </div>
        <HeatmapChart width={1150} height={380} events={true} />
      </div>

      {/* 7. Hotspots & Aging Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Hotspots */}
        <Panel className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-[var(--brand-warning)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">High Density Areas</h2>
              <p className="text-xs text-[var(--text-muted)]">Hotspots by complaint volume and priority</p>
            </div>
          </div>
          <div className="space-y-3">
            {hotspots && hotspots.length > 0 ? hotspots.slice(0, 5).map((h, i) => {
              // Heat color bg based on rank
              const heatColors = [
                "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800/50",
                "bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800/50",
                "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50",
                "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/30",
                "bg-[var(--surface-muted)] border-[var(--border-default)]"
              ];
              
              const coordLat = h._id?.lat || (h.lat ?? 0);
              const coordLng = h._id?.lng || (h.lng ?? 0);
              const category = h._id?.category || h.category;

              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-md border ${heatColors[i]}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--text-secondary)] opacity-70">#{i + 1}</span>
                    <div>
                      <div className="font-medium text-sm text-[var(--text-primary)] capitalize">{category}</div>
                      <div className="text-xs text-[var(--text-muted)] font-mono">{coordLat.toFixed(4)}, {coordLng.toFixed(4)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm text-[var(--text-primary)]">{h.complaint_count} issues</div>
                    <div className="text-xs text-[var(--brand-danger)] font-medium">Critical/High: {h.critical_or_high_count || 0}</div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-sm text-[var(--text-muted)] text-center py-8">No hotspot data available</div>
            )}
          </div>
        </Panel>

        {/* 6. Aging complaints */}
        <Panel className="p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-[var(--brand-danger)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Aging Complaints</h2>
              <p className="text-xs text-[var(--text-muted)]">Unresolved issues older than {slaThreshold} hours</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[400px]">
            {aging && aging.length > 0 ? (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[var(--text-muted)]">
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Age</th>
                    <th className="pb-2 font-medium">Priority</th>
                    <th className="pb-2 font-medium">Dept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {aging.sort((a, b) => (b.hours_elapsed || 0) - (a.hours_elapsed || 0)).map((a, i) => {
                    const hrs = a.hours_elapsed || 0;
                    let rowColor = "";
                    if (hrs > 96) rowColor = "bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400 font-medium";
                    else if (hrs > 72) rowColor = "bg-orange-50/50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400";
                    else if (hrs > 48) rowColor = "bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400";

                    return (
                      <tr key={i} className={rowColor}>
                        <td className="py-2 pr-2 font-mono text-xs">{a.complaint_id}</td>
                        <td className="py-2 pr-2 capitalize">{a.category}</td>
                        <td className="py-2 pr-2 font-medium">{Math.round(hrs)}h</td>
                        <td className="py-2 pr-2"><PriorityBadge priority={a.priority_label || 'Low'} /></td>
                        <td className="py-2 text-xs truncate max-w-[100px]">{a.assigned_to || 'Unassigned'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-[var(--text-muted)] text-center py-8 flex flex-col items-center justify-center h-full">
                <div className="text-4xl mb-2">🎉</div>
                No aging complaints found!
              </div>
            )}
          </div>
        </Panel>
        
      </div>
    </div>
  );
}
