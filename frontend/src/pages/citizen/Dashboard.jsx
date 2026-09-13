import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import StatCard from "../../components/StatCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

/* Ported from ResolveAI's `page_citizen_dash`: 4 stat cards (total / open /
 * in-progress / resolved) computed client-side from the complaint list,
 * plus two big call-to-action buttons. ResolveAI's statuses were
 * open/in_progress/resolved; this project's are New/Assigned/In
 * Progress/Resolved, so "open" below covers New+Assigned. */
export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/complaints/mine")
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load complaints"));
  }, []);

  const total = complaints?.length ?? null;
  const open = complaints?.filter((c) => c.status === "New" || c.status === "Assigned").length ?? null;
  const inProgress = complaints?.filter((c) => c.status === "In Progress").length ?? null;
  const resolved = complaints?.filter((c) => c.status === "Resolved").length ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}!</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={total ?? "—"} tone="slate" />
        <StatCard label="Open" value={open ?? "—"} tone="red" />
        <StatCard label="In Progress" value={inProgress ?? "—"} tone="amber" />
        <StatCard label="Resolved" value={resolved ?? "—"} tone="emerald" />
      </div>

      <div className="mt-8 flex gap-4">
        <Link to="/citizen/submit" className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700">
          📝 Submit New Complaint
        </Link>
        <Link to="/citizen/complaints" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
          📋 View My Complaints
        </Link>
      </div>
    </div>
  );
}
