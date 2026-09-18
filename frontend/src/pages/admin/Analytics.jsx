import { useEffect, useState, useCallback } from "react";
import { BarChart3, Clock, AlertTriangle, RefreshCw, Map, Download } from "lucide-react";

import { api } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.jsx";
import Panel from "../../components/ui/Panel.jsx";
import MiniBarChart from "../../components/charts/MiniBarChart.jsx";
import SimpleLineChart from "../../components/charts/SimpleLineChart.jsx";
import { PriorityBadge } from "../../components/Badges.jsx";
import Button from "../../components/ui/Button.jsx";
import CivicHeatmap from "../../components/CivicHeatmap.jsx";
import IntakePeakDistribution from "../../components/charts/IntakePeakDistribution.jsx";

export default function Analytics() {
  const { toast } = useToast();
  
  const [summary, setSummary] = useState(null);
  const [sla, setSla] = useState(null);
  const [trend, setTrend] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [aging, setAging] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
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
  let slaColor = "#ef4444"; // Red
  if (compliancePercent > 80) slaColor = "#22c55e"; // Green
  else if (compliancePercent >= 60) slaColor = "#f59e0b"; // Amber
  
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("civic_token");
      const res = await fetch("/api/analytics/export?format=csv", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error("Failed to generate CSV export");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `civic_complaints_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Operational analytics report exported successfully");
    } catch (err) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2.5">
            <BarChart3 size={24} className="text-brand" />
            Operational Analytics & Telemetry
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Real-time municipal performance KPIs, dispatch SLA thresholds, and geographic trends.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span>Synced: {getRelativeTimeMinutes()}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            isLoading={isExporting} 
            className="flex items-center gap-1.5 border-brand/40 text-brand hover:bg-brand/10"
            title="Download full operational records as CSV"
          >
            <Download size={13} /> Export Report (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} className="flex items-center gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2. SLA Performance Section */}
      <Panel className="p-6">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" 
                  stroke={slaColor} strokeWidth="8" 
                  strokeDasharray={dashArray} strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: slaColor }}>{compliancePercent}%</span>
                <span className="text-[10px] text-ink-muted uppercase font-semibold tracking-wider">Compliance</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-base font-bold text-ink">SLA Compliance Target</h2>
              <div className="text-xs text-ink-secondary">Municipal resolution window for incoming citizen cases</div>
              <div className="mt-2 flex items-center gap-2">
                {['48', '72', '96'].map(hours => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setSlaThreshold(hours)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      slaThreshold === hours 
                        ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 border-transparent shadow-sm' 
                        : 'bg-surface-muted text-ink-secondary border-border hover:border-brand/40'
                    }`}
                  >
                    {hours} Hours
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1 w-full md:pl-8 md:border-l border-border">
            <div>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                <Clock size={13} /> Avg Resolution
              </div>
              <div className="text-2xl font-bold mt-1 text-ink">
                {sla?.avg_resolution_hours ? Math.round(sla.avg_resolution_hours) : "—"} 
                <span className="text-xs text-ink-muted font-normal ml-1">hrs</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                Within SLA
              </div>
              <div className="text-2xl font-bold mt-1 text-success">
                {sla?.resolved_within_sla ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                Breaching SLA
              </div>
              <div className="text-2xl font-bold mt-1 text-danger">
                {sla?.breaching_sla_now ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1">
                Active Queue
              </div>
              <div className="text-2xl font-bold mt-1 text-ink">
                {sla?.open_count ?? 0}
              </div>
            </div>
          </div>
          
        </div>
      </Panel>

      {/* 3. Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel className="p-5 flex flex-col">
          <h2 className="text-sm font-semibold mb-4 text-ink">Status Distribution</h2>
          <div className="flex-1">
            <MiniBarChart data={statusData} />
          </div>
        </Panel>
        <Panel className="p-5 flex flex-col">
          <h2 className="text-sm font-semibold mb-4 text-ink">Priority Distribution</h2>
          <div className="flex-1">
            <MiniBarChart data={priorityData} />
          </div>
        </Panel>
      </div>

      {/* 4. Trend chart */}
      <Panel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">30-Day Activity Curve</h2>
            <p className="text-xs text-ink-muted">Historical volume comparison of incoming vs resolved issues</p>
          </div>
          <div className="flex bg-surface-muted rounded-md border border-border p-1">
            {["Filed", "Resolved", "Both"].map(opt => (
              <button 
                key={opt}
                type="button"
                onClick={() => setTrendToggle(opt)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  trendToggle === opt 
                    ? 'bg-card shadow-sm text-ink font-semibold' 
                    : 'text-ink-muted hover:text-ink'
                }`}
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
          <Map size={18} className="text-brand" />
          <h2 className="text-lg font-bold text-ink">Geospatial Incident Heatmap</h2>
        </div>
        <CivicHeatmap />
      </div>

      {/* 6. Hourly Intake Distribution & Peak Load (Replaced blocky matrix) */}
      <IntakePeakDistribution />

      {/* 7. Hotspots & Aging Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hotspots */}
        <Panel className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-warning" />
            <div>
              <h2 className="text-sm font-semibold text-ink">High Density Areas</h2>
              <p className="text-xs text-ink-muted">Hotspots by complaint volume and urgency</p>
            </div>
          </div>
          <div className="space-y-3">
            {hotspots && hotspots.length > 0 ? hotspots.slice(0, 5).map((h, i) => {
              const coordLat = h._id?.lat || (h.lat ?? 0);
              const coordLng = h._id?.lng || (h.lng ?? 0);
              const category = h._id?.category || h.category;

              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-muted/40 hover:bg-surface-muted/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-ink-muted">#{i + 1}</span>
                    <div>
                      <div className="font-semibold text-xs text-ink capitalize">{category}</div>
                      <div className="text-[11px] text-ink-muted font-mono">{coordLat.toFixed(4)}, {coordLng.toFixed(4)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-xs text-ink">{h.complaint_count} issues</div>
                    <div className="text-[11px] text-danger font-medium">Critical/High: {h.critical_or_high_count || 0}</div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-xs text-ink-muted text-center py-8">No hotspot data available</div>
            )}
          </div>
        </Panel>

        {/* Aging complaints */}
        <Panel className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-danger" />
            <div>
              <h2 className="text-sm font-semibold text-ink">Aging Unresolved Complaints</h2>
              <p className="text-xs text-ink-muted">Complaints exceeding {slaThreshold} hours in queue</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[350px]">
            {aging && aging.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-ink-muted uppercase tracking-wider text-[10px]">
                    <th className="pb-2 font-semibold">ID</th>
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold">Age</th>
                    <th className="pb-2 font-semibold">Priority</th>
                    <th className="pb-2 font-semibold">Dept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {aging.sort((a, b) => (b.hours_elapsed || 0) - (a.hours_elapsed || 0)).map((a, i) => {
                    const hrs = a.hours_elapsed || 0;
                    return (
                      <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 pr-2 font-mono text-[11px] font-medium text-ink">{a.complaint_id}</td>
                        <td className="py-2.5 pr-2 capitalize text-ink-secondary">{a.category}</td>
                        <td className="py-2.5 pr-2 font-bold text-danger">{Math.round(hrs)}h</td>
                        <td className="py-2.5 pr-2"><PriorityBadge priority={a.priority_label || 'Low'} /></td>
                        <td className="py-2.5 text-[11px] text-ink-secondary truncate max-w-[100px]">{a.assigned_to || 'Unassigned'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-xs text-ink-muted text-center py-12 flex flex-col items-center justify-center h-full space-y-2">
                <div className="text-3xl">🎉</div>
                <p className="font-medium text-ink">No aging complaints found!</p>
                <p>All active municipal issues are within SLA tolerance.</p>
              </div>
            )}
          </div>
        </Panel>
        
      </div>
    </div>
  );
}
