import { AlertTriangle, ListChecks, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { Select, TextInput } from "../../components/ui/Field.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import HistoryTimeline from "../../components/HistoryTimeline.jsx";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { STATUSES } from "../../constants.js";

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
      <PageHeader icon={ListChecks} title="My complaints" />

      <div className="mt-4 flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
          <option value="created_at">Newest first</option>
          <option value="priority_score">Highest priority first</option>
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}
      {complaints && visible.length === 0 && <p className="mt-6 text-sm text-ink-soft">No complaints found.</p>}

      <div className="mt-4 space-y-3">
        {visible.map((c) => (
          <Panel key={c.id} accent={c.status === "New" ? "brick" : c.status === "Resolved" ? "civic" : "signal"}>
            <button onClick={() => toggleExpand(c)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <div>
                <p className="font-ref text-xs text-ink-soft">{c.complaint_id}</p>
                <p className="mt-0.5 font-medium text-ink">{c.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <PriorityBadge priority={c.priority_label} />
                <StatusBadge status={c.status} />
              </div>
            </button>
            {expanded === c.id && (
              <div className="border-t border-line px-4 py-4">
                <p className="text-sm text-ink">{c.description}</p>
                {c.is_duplicate && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-signal-dark">
                    <AlertTriangle size={13} strokeWidth={2} /> Flagged as a likely duplicate
                  </p>
                )}
                {c.assigned_to && <p className="mt-2 text-xs text-ink-soft">Assigned to: {c.assigned_to}</p>}

                <h4 className="mt-4 text-sm font-medium text-ink">History</h4>
                <div className="mt-2">
                  {track ? <HistoryTimeline history={track.history} /> : <p className="text-sm text-ink-soft">Loading…</p>}
                </div>

                <div className="mt-4 flex gap-2">
                  <TextInput
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    className="mt-0 flex-1"
                  />
                  <Button variant="primary" size="sm" onClick={() => submitComment(c.id)} disabled={commentBusy}>
                    <Send size={13} strokeWidth={2} /> Send
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
