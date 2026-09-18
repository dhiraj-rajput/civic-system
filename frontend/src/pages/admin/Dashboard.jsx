import { useEffect, useState, useCallback } from "react";
import { RefreshCcw, LayoutDashboard, ListChecks, Building2, BarChart3, AlertCircle, Clock, CheckCircle, Flame, Layers, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.jsx";
import Button from "../../components/ui/Button.jsx";
import Panel from "../../components/ui/Panel.jsx";
import StatCard from "../../components/StatCard.jsx";
import MiniBarChart from "../../components/charts/MiniBarChart.jsx";
import SimpleLineChart from "../../components/charts/SimpleLineChart.jsx";

export default function Dashboard() {
  const { toast } = useToast();
  const [summary, setSummary] = useState(null);
  const [sla, setSla] = useState(null);
  const [trend, setTrend] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumData, slaData, trendData, hotData] = await Promise.all([
        api.get("/analytics/summary"),
        api.get("/analytics/sla?sla_hours=72"),
        api.get("/analytics/trend?days=30"),
        api.get("/analytics/hotspots")
      ]);
      setSummary(sumData);
      setSla(slaData);
      setTrend(trendData);
      setHotspots(hotData);
    } catch (e) {
      toast.error(e.detail || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform data for charts
  const statusData = summary?.by_status?.map(item => ({
    label: item._id,
    value: item.count
  })) || [];

  const categoryData = summary?.by_category?.map(item => ({
    label: item._id,
    value: item.count
  })) || [];

  const compliancePercent = sla?.sla_compliance_pct != null 
    ? Math.round(sla.sla_compliance_pct) 
    : (sla?.compliance_percent != null ? Math.round(sla.compliance_percent) : 100);
  let slaColor = "var(--brand-danger)";
  if (compliancePercent > 80) slaColor = "var(--brand-success)";
  else if (compliancePercent >= 60) slaColor = "var(--brand-warning)";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Welcome row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <LayoutDashboard size={24} className="text-[var(--brand-primary)]" />
            Admin Overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} isLoading={loading}>
          <RefreshCcw size={16} />
          Refresh
        </Button>
      </div>

      {/* 2. KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard 
          label="Total Complaints" 
          value={summary?.total_complaints ?? "—"} 
          tone="blue" 
          icon={Layers}
        />
        <StatCard 
          label="Unresolved" 
          value={summary?.unresolved_count ?? "—"} 
          tone="amber" 
          icon={AlertCircle}
        />
        <Link to="/admin/complaints?filter=unassigned" className="block transition-transform hover:scale-[1.02]" title="Click to view unassigned complaints needing department dispatch">
          <StatCard 
            label="Unassigned (Action Required)" 
            value={summary?.unassigned_count ?? "—"} 
            tone="red" 
            icon={ListChecks}
          />
        </Link>
        <StatCard 
          label="Active Field Officers" 
          value={summary?.active_officers_count ?? "0"} 
          tone="blue" 
          icon={Users}
        />
        <StatCard 
          label="SLA Compliance %" 
          value={sla ? `${compliancePercent}%` : "—"} 
          tone="green" 
          icon={CheckCircle}
        />
        <StatCard 
          label="Avg Resolution hrs" 
          value={sla?.avg_resolution_hours ? Math.round(sla.avg_resolution_hours) : "—"} 
          tone="purple" 
          icon={Clock}
        />
        <StatCard 
          label="Likely Duplicates" 
          value={summary?.duplicate_count ?? "—"} 
          tone="gray" 
          icon={Layers}
        />
        <StatCard 
          label="Active Agencies" 
          value={summary?.active_departments_count ?? "—"} 
          tone="purple" 
          icon={Building2}
        />
      </div>

      {/* 3. Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel className="p-4 flex flex-col">
          <h2 className="text-sm font-semibold mb-6 text-[var(--text-primary)]">Complaints by Status</h2>
          <div className="flex-1">
            <MiniBarChart data={statusData} />
          </div>
        </Panel>
        <Panel className="p-4 flex flex-col">
          <h2 className="text-sm font-semibold mb-6 text-[var(--text-primary)]">Complaints by Category</h2>
          <div className="flex-1">
            <MiniBarChart data={categoryData} />
          </div>
        </Panel>
      </div>

      {/* 4. Trend chart */}
      <Panel className="p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">30-Day Complaint Velocity & Intake</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Tracking intake trends versus resolution throughput</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            30 Days Active
          </span>
        </div>
        <SimpleLineChart data={trend} height={200} />
      </Panel>

      {/* 5. Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel className="p-4">
          <h2 className="text-sm font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-2">
            <Flame size={18} className="text-[var(--brand-warning)]" />
            Top Hotspots
          </h2>
          {hotspots && hotspots.length > 0 ? (
            <div className="space-y-3">
              {hotspots.slice(0, 5).map((hotspot, idx) => {
                const category = hotspot.category || hotspot._id?.category || "general";
                const lat = typeof hotspot.lat === "number" ? hotspot.lat : (hotspot._id?.lat ?? 0);
                const lng = typeof hotspot.lng === "number" ? hotspot.lng : (hotspot._id?.lng ?? 0);
                const count = hotspot.complaint_count ?? 0;
                const avgPri = hotspot.avg_priority_score ?? hotspot.avg_priority ?? 0;

                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[var(--text-secondary)]">#{idx + 1}</span>
                      <div>
                        <div className="font-medium text-sm text-[var(--text-primary)] capitalize">{category.replace('_', ' ')}</div>
                        <div className="text-xs text-[var(--text-muted)] font-mono">
                          {lat.toFixed(4)}, {lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm text-[var(--text-primary)]">{count} issues</div>
                      <div className="text-xs text-[var(--text-muted)]">Avg Priority: {avgPri.toFixed(1)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-[var(--text-muted)] text-center py-8">No hotspots found</div>
          )}
        </Panel>

        <Panel className="p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold mb-4 text-[var(--text-primary)]">SLA Performance</h2>
            <div className="flex items-center justify-center py-6">
              <div className="text-6xl font-bold" style={{ color: slaColor }}>
                {compliancePercent}%
              </div>
            </div>
            <div className="flex justify-around text-center mt-4 border-t border-[var(--border-default)] pt-4">
              <div>
                <div className="text-2xl font-semibold text-[var(--text-primary)]">{sla?.open_count ?? sla?.total_open ?? 0}</div>
                <div className="text-xs text-[var(--text-secondary)]">Open Issues</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[var(--brand-danger)]">{sla?.breaching_sla_now ?? sla?.breaching_now ?? 0}</div>
                <div className="text-xs text-[var(--text-secondary)]">Breaching SLA</div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Link to="/admin/analytics">
              <Button variant="ghost" size="sm">View Full Analytics</Button>
            </Link>
          </div>
        </Panel>
      </div>

      {/* 6. Quick nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--border-default)] pt-8 mt-8">
        <Link to="/admin/complaints" className="block group">
          <Panel className="p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md border-l-4 border-l-[var(--brand-primary)]">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors">
              <ListChecks size={24} />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Manage Complaints</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Review, assign, and update</div>
            </div>
          </Panel>
        </Link>
        <Link to="/admin/departments" className="block group">
          <Panel className="p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md border-l-4 border-l-[var(--brand-accent)]">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[var(--brand-accent)] group-hover:bg-[var(--brand-accent)] group-hover:text-white transition-colors">
              <Building2 size={24} />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Departments</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Manage routing and auto-assign</div>
            </div>
          </Panel>
        </Link>
        <Link to="/admin/analytics" className="block group">
          <Panel className="p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md border-l-4 border-l-[var(--brand-success)]">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-[var(--brand-success)] group-hover:bg-[var(--brand-success)] group-hover:text-white transition-colors">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Analytics</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Deep dive into performance</div>
            </div>
          </Panel>
        </Link>
      </div>
    </div>
  );
}
