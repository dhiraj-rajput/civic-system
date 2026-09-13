import { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client.js";
import HistoryTimeline from "../../components/HistoryTimeline.jsx";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { STATUSES } from "../../constants.js";

/* Ported from ResolveAI's `page_my_complaints`: status filter, sort control,
 * expandable rows, and a "Track complaint" button that fetches
 * /complaints/{id}/track on demand. Filtering/sorting happens client-side
 * here since /complaints/mine returns the full personal list already. */
export default function CitizenComplaints() {
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("created_at");
  const [expanded, setExpanded] = useState(null);
  const [track, setTrack] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  function load() {
    api
      .get("/complaints/mine")
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load complaints"));
  }

  useEffect(load, []);

  const visible = useMemo(() => {
    if (!complaints) return [];
    let list = statusFilter === "All" ? complaints : complaints.filter((c) => c.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "priority_score") return b.priority_score - a.priority_score;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return list;
  }, [complaints, statusFilter, sortBy]);

  async function toggleExpand(c) {
    if (expanded === c.id) {
      setExpanded(null);
      setTrack(null);
      return;
    }
    setExpanded(c.id);
    setTrack(null);
    try {
      const t = await api.get(`/complaints/${c.id}/track`);
      setTrack(t);
    } catch (e) {
      setError(e.detail || "Could not load history");
    }
  }

  async function submitComment(complaintId) {
    if (!commentText.trim()) return;
    setCommentBusy(true);
    try {
      await api.post(`/complaints/${complaintId}/comments`, { text: commentText });
      setCommentText("");
      const t = await api.get(`/complaints/${complaintId}/track`);
      setTrack(t);
    } catch (e) {
      setError(e.detail || "Could not add comment");
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">📋 My Complaints</h1>

      <div className="mt-4 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="created_at">Newest first</option>
          <option value="priority_score">Highest priority first</option>
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {complaints && visible.length === 0 && <p className="mt-6 text-sm text-slate-400">No complaints found.</p>}

      <div className="mt-4 space-y-3">
        {visible.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <button onClick={() => toggleExpand(c)} className="flex w-full items-center justify-between px-4 py-3 text-left">
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
                {c.is_duplicate && (
                  <p className="mt-2 text-xs text-amber-600">⚠️ Flagged as a likely duplicate</p>
                )}
                {c.assigned_to && <p className="mt-2 text-xs text-slate-500">Assigned to: {c.assigned_to}</p>}

                <h4 className="mt-4 text-sm font-semibold text-slate-700">History</h4>
                {track ? <HistoryTimeline history={track.history} /> : <p className="text-sm text-slate-400">Loading…</p>}

                <div className="mt-4 flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => submitComment(c.id)}
                    disabled={commentBusy}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Send
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
