import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import StatCard from "../../components/StatCard.jsx";

/* Ported from ResolveAI's `page_admin_dash` -- ResolveAI's own admin
 * dashboard was actually a stub ("Admin dashboard statistics are currently
 * unavailable") with only nav buttons. This version wires it to the real
 * GET /analytics/summary this project actually implements. */
export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/analytics/summary").then(setSummary).catch((e) => setError(e.detail || "Could not load analytics"));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">🛡️ Admin Dashboard</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Complaints" value={summary?.total_complaints ?? "—"} tone="slate" />
        <StatCard label="Unresolved" value={summary?.unresolved_count ?? "—"} tone="red" />
        <StatCard label="Unassigned" value={summary?.unassigned_count ?? "—"} tone="amber" />
        <StatCard label="Likely Duplicates" value={summary?.duplicate_count ?? "—"} tone="blue" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/complaints" className="rounded-lg bg-slate-900 px-5 py-4 text-center font-semibold text-white hover:bg-slate-700">
          📊 All Complaints
        </Link>
        <Link to="/admin/departments" className="rounded-lg border border-slate-300 px-5 py-4 text-center font-semibold text-slate-700 hover:bg-slate-50">
          🏢 Departments
        </Link>
        <Link to="/admin/analytics" className="rounded-lg border border-slate-300 px-5 py-4 text-center font-semibold text-slate-700 hover:bg-slate-50">
          📈 Analytics
        </Link>
      </div>
    </div>
  );
}
