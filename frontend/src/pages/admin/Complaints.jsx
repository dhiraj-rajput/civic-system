import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { CATEGORIES, STATUSES } from "../../constants.js";

/* Ported from ResolveAI's `page_all_complaints`: status/priority/department
 * filters, expandable rows, a "reassign to department" text input + button,
 * and a delete button. Reassign here uses the department dropdown (fed by
 * GET /departments) rather than free text, and an empty selection triggers
 * this project's auto-assign-by-category fallback
 * (PATCH .../assign with no body) instead of requiring a department name. */
export default function AdminComplaints() {
  const [complaints, setComplaints] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [assignByCid, setAssignByCid] = useState({});
  const [busyCid, setBusyCid] = useState(null);

  function load() {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status_filter", statusFilter);
    if (categoryFilter !== "All") params.set("category", categoryFilter);
    const qs = params.toString();
    api
      .get(`/complaints${qs ? `?${qs}` : ""}`)
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load complaints"));
  }

  useEffect(load, [statusFilter, categoryFilter]);
  useEffect(() => {
    api.get("/departments").then(setDepartments).catch(() => {});
  }, []);

  async function reassign(c) {
    const dept = assignByCid[c.id];
    setBusyCid(c.id);
    try {
      await api.patch(`/complaints/${c.id}/assign`, dept ? { assigned_to: dept } : {});
      load();
    } catch (e) {
      setError(e.detail || "Reassign failed");
    } finally {
      setBusyCid(null);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete complaint ${c.complaint_id}? This can't be undone.`)) return;
    setBusyCid(c.id);
    try {
      await api.del(`/complaints/${c.id}`);
      load();
    } catch (e) {
      setError(e.detail || "Delete failed");
    } finally {
      setBusyCid(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">📊 All Complaints</h1>

      <div className="mt-4 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {complaints && <p className="mt-4 text-sm text-slate-500">{complaints.length} complaint(s) found</p>}

      <div className="mt-2 space-y-3">
        {complaints?.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium text-slate-900">{c.complaint_id} · {c.category}</p>
                <p className="text-xs text-slate-400">
                  {c.assigned_to || "Unassigned"} · {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.is_duplicate && <span className="text-xs text-amber-600">⚠ dup</span>}
                <PriorityBadge priority={c.priority_label} />
                <StatusBadge status={c.status} />
              </div>
            </button>
            {expanded === c.id && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-700">{c.description}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Reassign to</label>
                    <select
                      value={assignByCid[c.id] ?? ""}
                      onChange={(e) => setAssignByCid((m) => ({ ...m, [c.id]: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">Auto (by category)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => reassign(c)}
                    disabled={busyCid === c.id}
                    className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    🔄 Assign
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={busyCid === c.id}
                    className="rounded-md border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
