import { ListChecks, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { Select, TextInput } from "../../components/ui/Field.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { STATUSES } from "../../constants.js";

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
      <PageHeader icon={ListChecks} title="Assigned complaints" />

      <div className="mt-4 flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
          <option>All</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}
      {complaints && complaints.length === 0 && <p className="mt-6 text-sm text-ink-soft">No complaints assigned.</p>}

      <div className="mt-4 space-y-3">
        {complaints?.map((c) => (
          <Panel key={c.id} accent={c.status === "Assigned" ? "brick" : c.status === "Resolved" ? "civic" : "signal"}>
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
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
                {c.address_text && <p className="mt-1 text-xs text-ink-soft">{c.address_text}</p>}

                <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Update status</label>
                    <Select
                      value={statusByCid[c.id] || c.status}
                      onChange={(e) => setStatusByCid((m) => ({ ...m, [c.id]: e.target.value }))}
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Note (optional, logged as a comment)</label>
                    <TextInput
                      value={noteByCid[c.id] || ""}
                      onChange={(e) => setNoteByCid((m) => ({ ...m, [c.id]: e.target.value }))}
                    />
                  </div>
                  <Button variant="accent" size="sm" onClick={() => saveUpdate(c)} disabled={busyCid === c.id}>
                    <Save size={13} strokeWidth={2} /> Save
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
