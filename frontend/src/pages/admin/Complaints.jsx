import { ListChecks, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { Select } from "../../components/ui/Field.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { CATEGORIES, STATUSES } from "../../constants.js";

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
      <PageHeader icon={ListChecks} title="All complaints" description={complaints ? `${complaints.length} case(s)` : undefined} />

      <div className="mt-4 flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <div className="mt-4 space-y-3">
        {complaints?.map((c) => (
          <Panel key={c.id} accent={c.status === "New" ? "brick" : c.status === "Resolved" ? "civic" : "signal"}>
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-ref text-xs text-ink-soft">{c.complaint_id}</p>
                <p className="mt-0.5 font-medium text-ink">
                  {c.category} <span className="font-normal text-ink-soft">· {c.assigned_to || "Unassigned"}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {c.is_duplicate && <span className="text-xs text-signal-dark">dup</span>}
                <PriorityBadge priority={c.priority_label} />
                <StatusBadge status={c.status} />
              </div>
            </button>
            {expanded === c.id && (
              <div className="border-t border-line px-4 py-4">
                <p className="text-sm text-ink">{c.description}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Reassign to</label>
                    <Select
                      value={assignByCid[c.id] ?? ""}
                      onChange={(e) => setAssignByCid((m) => ({ ...m, [c.id]: e.target.value }))}
                    >
                      <option value="">Auto (by category)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </Select>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => reassign(c)} disabled={busyCid === c.id}>
                    <RefreshCw size={13} strokeWidth={2} /> Assign
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(c)} disabled={busyCid === c.id}>
                    <Trash2 size={13} strokeWidth={2} /> Delete
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
