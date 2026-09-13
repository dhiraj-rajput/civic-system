import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import BarList from "../../components/BarList.jsx";
import StatCard from "../../components/StatCard.jsx";

/* Ported from ResolveAI's `page_analytics`: bar charts for by_status/
 * by_department/by_priority, plus avg-resolution-time / duplicate-rate /
 * "AI accuracy" metrics. ResolveAI's own analytics endpoint was never
 * implemented (`st.info("Analytics data unavailable")` with a random
 * placeholder chart) and its "AI accuracy" metric had no model behind it to
 * measure -- dropped here in favor of this project's real /analytics/summary,
 * /analytics/hotspots, and /analytics/sla, which are all actually computed
 * from the complaints collection. */
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
      <h1 className="text-2xl font-bold text-slate-900">📈 Analytics</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="SLA Compliance" value={sla ? `${sla.sla_compliance_pct ?? "—"}%` : "—"} tone="emerald" />
        <StatCard label="Avg Resolution (hrs)" value={sla?.avg_resolution_hours ?? "—"} tone="blue" />
        <StatCard label="Breaching SLA Now" value={sla?.breaching_sla_now ?? "—"} tone="red" />
        <StatCard label="Likely Duplicates" value={summary?.duplicate_count ?? "—"} tone="amber" />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Complaints by Status</h2>
          <div className="mt-3">
            <BarList data={summary?.by_status} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Complaints by Category</h2>
          <div className="mt-3">
            <BarList data={summary?.by_category} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Priority Distribution</h2>
          <div className="mt-3">
            <BarList data={summary?.by_priority} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">🔥 High-Priority Locations</h2>
          <p className="mt-1 text-xs text-slate-500">Unresolved complaints clustered by location, ranked by total priority score.</p>
          <div className="mt-3 space-y-2">
            {hotspots?.length ? (
              hotspots.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {h.category} · {h.lat.toFixed(3)}, {h.lng.toFixed(3)}
                  </span>
                  <span className="font-medium text-slate-700">{h.complaint_count} complaints · score {h.total_priority_score}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No hotspots yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
