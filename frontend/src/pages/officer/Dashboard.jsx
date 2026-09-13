import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import StatCard from "../../components/StatCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

/* Ported from ResolveAI's `page_dept_dash`: assigned/pending/in-progress/
 * resolved stat cards computed from the department's own queue
 * (GET /complaints, auto-scoped server-side to the officer's department --
 * see routers/complaints.py's list_complaints). */
export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/complaints")
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load queue"));
  }, []);

  const assigned = complaints?.length ?? null;
  const pending = complaints?.filter((c) => c.status === "Assigned").length ?? null;
  const inProgress = complaints?.filter((c) => c.status === "In Progress").length ?? null;
  const resolved = complaints?.filter((c) => c.status === "Resolved").length ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">🏢 {user?.department} Dashboard</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Assigned" value={assigned ?? "—"} tone="slate" />
        <StatCard label="Pending" value={pending ?? "—"} tone="amber" />
        <StatCard label="In Progress" value={inProgress ?? "—"} tone="blue" />
        <StatCard label="Resolved" value={resolved ?? "—"} tone="emerald" />
      </div>

      <div className="mt-8">
        <Link to="/officer/complaints" className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700">
          📋 View Assigned Complaints
        </Link>
      </div>
    </div>
  );
}
