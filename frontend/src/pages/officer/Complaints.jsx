import { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client.js";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { STATUSES } from "../../constants.js";

/* Ported from ResolveAI's `page_dept_complaints`: status/priority filters,
 * expandable rows, inline "update status + resolution note" form per row.
 * ResolveAI stored a free-text `action_taken` field on update; this
 * backend's PATCH /complaints/{id}/status only takes status, so a
 * resolution note is instead posted as a comment (POST .../comments) right
 * before the status change, keeping it in the audit trail either way. */
export default function OfficerComplaints() {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [noteByCid, setNoteByCid] = useState({});
  const [statusByCid, setStatusByCid] = useState({});
  const [busyCid, setBusyCid] = useState(null);

  function load() {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status_filter", statusFilter);
    if (categoryFilter !== "All") params.set("category", categoryFilter);
    const qs = params.toString();
    api
      .get(`/complaints${qs ? `?${qs}` : ""}`)
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load queue"));
  }

  useEffect(load, [statusFilter, categoryFilter]);

  const categories = useMemo(
    () => (complaints ? Array.from(new Set(complaints.map((c) => c.category))) : []),
    [complaints]
  );

  async function saveUpdate(c) {
    const note = noteByCid[c.id]?.trim();
    const newStatus = statusByCid[c.id] || c.status;
    setBusyCid(c.id);
    try {
      if (note) {
        await api.post(`/complaints/${c.id}/comments`, { text: note });
      }
      if (newStatus !== c.status) {
        await api.patch(`/complaints/${c.id}/status`, { status: newStatus });
      }
      setNoteByCid((m) => ({ ...m, [c.id]: "" }));
      load();
    } catch (e) {
      setError(e.detail || "Update failed");
    } finally {
      setBusyCid(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">📋 Assigned Complaints</h1>

      <div className="mt-4 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option>All</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {complaints && complaints.length === 0 && <p className="mt-6 text-sm text-slate-400">No complaints assigned.</p>}

      <div className="mt-4 space-y-3">
        {complaints?.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium text-slate-900">{c.complaint_id} · {c.category}</p>
                <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={c.priority_label} />
                <StatusBadge status={c.status} />
              </div>
            </button>
            {expanded === c.id && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-700">{c.description}</p>
                {c.address_text && <p className="mt-1 text-xs text-slate-500">📍 {c.address_text}</p>}

                <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Update status</label>
                    <select
                      value={statusByCid[c.id] || c.status}
                      onChange={(e) => setStatusByCid((m) => ({ ...m, [c.id]: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Note (optional, logged as a comment)</label>
                    <input
                      value={noteByCid[c.id] || ""}
                      onChange={(e) => setNoteByCid((m) => ({ ...m, [c.id]: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => saveUpdate(c)}
                    disabled={busyCid === c.id}
                    className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    💾 Save
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
