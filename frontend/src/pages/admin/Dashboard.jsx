import { BarChart3, Building2, ListChecks, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import Panel from "../../components/ui/Panel.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/analytics/summary").then(setSummary).catch((e) => setError(e.detail || "Could not load analytics"));
  }, []);

  const links = [
    { to: "/admin/complaints", label: "All complaints", icon: ListChecks, tone: "steel", iconClass: "text-steel" },
    { to: "/admin/departments", label: "Departments", icon: Building2, tone: "signal", iconClass: "text-signal" },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3, tone: "civic", iconClass: "text-civic" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader icon={ShieldCheck} title="Admin dashboard" />

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total complaints" value={summary?.total_complaints ?? "—"} tone="steel" />
        <StatCard label="Unresolved" value={summary?.unresolved_count ?? "—"} tone="brick" />
        <StatCard label="Unassigned" value={summary?.unassigned_count ?? "—"} tone="signal" />
        <StatCard label="Likely duplicates" value={summary?.duplicate_count ?? "—"} tone="civic" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {links.map((l) => (
          <Panel key={l.to} accent={l.tone} className="p-0">
            <Link to={l.to} className="flex items-center gap-3 px-5 py-4 hover:bg-paper">
              <l.icon size={18} strokeWidth={2} className={l.iconClass} />
              <span className="font-medium text-ink">{l.label}</span>
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
