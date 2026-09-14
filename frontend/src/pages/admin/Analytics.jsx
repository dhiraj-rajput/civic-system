import { BarChart3, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import BarList from "../../components/BarList.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import StatCard from "../../components/StatCard.jsx";

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [sla, setSla] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/summary"),
      api.get("/analytics/hotspots"),
      api.get("/analytics/sla"),
    ])
      .then(([s, h, sl]) => {
        setSummary(s);
        setHotspots(h);
        setSla(sl);
      })
      .catch((e) => setError(e.detail || "Could not load analytics"));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader icon={BarChart3} title="Analytics" />
      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="SLA compliance" value={sla ? `${sla.sla_compliance_pct ?? "—"}%` : "—"} tone="civic" />
        <StatCard label="Avg resolution (hrs)" value={sla?.avg_resolution_hours ?? "—"} tone="steel" />
        <StatCard label="Breaching SLA now" value={sla?.breaching_sla_now ?? "—"} tone="brick" />
        <StatCard label="Likely duplicates" value={summary?.duplicate_count ?? "—"} tone="signal" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Panel accent="steel" className="p-5">
          <h2 className="font-display font-semibold text-ink">Complaints by status</h2>
          <div className="mt-4">
            <BarList data={summary?.by_status} />
          </div>
        </Panel>
        <Panel accent="steel" className="p-5">
          <h2 className="font-display font-semibold text-ink">Complaints by category</h2>
          <div className="mt-4">
            <BarList data={summary?.by_category} />
          </div>
        </Panel>
        <Panel accent="signal" className="p-5">
          <h2 className="font-display font-semibold text-ink">Priority distribution</h2>
          <div className="mt-4">
            <BarList data={summary?.by_priority} />
          </div>
        </Panel>
        <Panel accent="brick" className="p-5">
          <h2 className="flex items-center gap-1.5 font-display font-semibold text-ink">
            <MapPin size={16} strokeWidth={2} className="text-brick" /> High-priority locations
          </h2>
          <p className="mt-1 text-xs text-ink-soft">Unresolved complaints clustered by location, ranked by total priority score.</p>
          <div className="mt-3 space-y-2">
            {hotspots?.length ? (
              hotspots.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-paper px-3 py-2 text-sm">
                  <span className="text-ink">
                    {h.category} <span className="font-ref text-xs text-ink-soft">{h.lat.toFixed(3)}, {h.lng.toFixed(3)}</span>
                  </span>
                  <span className="font-ref text-xs text-ink-soft">{h.complaint_count} cases · score {h.total_priority_score}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-soft">No hotspots yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
