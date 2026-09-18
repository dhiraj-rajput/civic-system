import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListChecks, Trash2, UserPlus, X, RefreshCw, Sparkles, ChevronRight, ArrowUpDown } from "lucide-react";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import SearchInput from "../../components/ui/SearchInput.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import HistoryTimeline from "../../components/HistoryTimeline.jsx";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { CATEGORIES, STATUSES } from "../../constants.js";
import SmartAssignModal from "../../components/SmartAssignModal.jsx";
import PriorityExplainer from "../../components/PriorityExplainer.jsx";
import MediaGallery from "../../components/MediaGallery.jsx";
import ComplaintMap from "../../components/ComplaintMap.jsx";

export default function Complaints() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // "newest", "priority", "oldest"
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Handle URL pre-filters like ?filter=unassigned
  useEffect(() => {
    if (searchParams.get("filter") === "unassigned") {
      setShowUnassignedOnly(true);
    }
  }, [searchParams]);

  // UI State
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [assignModalComplaint, setAssignModalComplaint] = useState(null);
  
  // Inline edit state
  const [assignDept, setAssignDept] = useState({});
  const [updateStatus, setUpdateStatus] = useState({});
  const [commentDraft, setCommentDraft] = useState({});
  const [commentBusy, setCommentBusy] = useState({});
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compData, deptData] = await Promise.all([
        api.get("/complaints?limit=2500&sort_by=newest"),
        api.get("/departments").catch(() => [])
      ]);
      setComplaints(compData);
      setDepartments(deptData);
    } catch (e) {
      toast.error(e.detail || "Could not load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setShowUnassignedOnly(false);
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Count unassigned
  const unassignedCount = useMemo(() => {
    return complaints.filter((c) => !c.assigned_to).length;
  }, [complaints]);

  // Client-side filtering & sorting
  const filteredComplaints = useMemo(() => {
    let list = complaints.filter((c) => {
      const matchSearch = !search || 
        c.complaint_id.toLowerCase().includes(search.toLowerCase()) || 
        (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
        (c.assigned_to && c.assigned_to.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "All" || c.status === statusFilter;
      const matchCategory = categoryFilter === "All" || c.category === categoryFilter;
      const matchUnassigned = !showUnassignedOnly || !c.assigned_to;
      return matchSearch && matchStatus && matchCategory && matchUnassigned;
    });

    if (sortBy === "priority") {
      list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [complaints, search, statusFilter, categoryFilter, showUnassignedOnly, sortBy]);

  // Client-side pagination
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredComplaints.slice(start, start + itemsPerPage);
  }, [filteredComplaints, currentPage]);

  const handleAssign = async (complaintId, departmentName) => {
    setBusy(true);
    try {
      await api.patch(`/complaints/${complaintId}/assign`, departmentName ? { assigned_to: departmentName } : {});
      toast.success("Complaint reassigned successfully");
      loadData();
    } catch (e) {
      toast.error(e.detail || "Reassign failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = async (complaintId, newStatus) => {
    if (!newStatus) return;
    setBusy(true);
    try {
      await api.patch(`/complaints/${complaintId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      loadData();
    } catch (e) {
      toast.error(e.detail || "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async (complaintId) => {
    const text = (commentDraft[complaintId] || "").trim();
    if (!text) return;
    setCommentBusy({ ...commentBusy, [complaintId]: true });
    try {
      await api.post(`/complaints/${complaintId}/comments`, { text });
      toast.success("Comment added");
      setCommentDraft({ ...commentDraft, [complaintId]: "" });
      loadData();
    } catch (e) {
      toast.error(e.detail || "Failed to add comment");
    } finally {
      setCommentBusy({ ...commentBusy, [complaintId]: false });
    }
  };

  const handleDelete = async (complaintId) => {
    setBusy(true);
    try {
      await api.del(`/complaints/${complaintId}`);
      toast.success("Complaint deleted");
      loadData();
    } catch (e) {
      toast.error(e.detail || "Delete failed");
    } finally {
      setBusy(false);
      setDeleteModalId(null);
    }
  };

  const getRelativeTime = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ListChecks size={24} className="text-[var(--brand-primary)]" />
          Complaint Management
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-1 rounded-full border border-[var(--border-default)]">
            {filteredComplaints.length}
          </span>
        </h1>
      </div>

      {/* 2. Filter/search bar */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-md p-4 shadow-[var(--shadow-card)] flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 flex-1 items-center">
          <SearchInput 
            value={search} 
            onChange={(val) => { setSearch(val); setCurrentPage(1); }} 
            placeholder="Search ID or description..."
            className="w-full max-w-xs"
          />
          
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select 
            value={categoryFilter} 
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Quick Unassigned / Needs Assignment Toggle */}
          <button
            type="button"
            onClick={() => { setShowUnassignedOnly(!showUnassignedOnly); setCurrentPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border transition-all ${
              showUnassignedOnly
                ? "bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400 shadow-sm ring-1 ring-red-500/30"
                : "bg-[var(--surface-input)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-red-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showUnassignedOnly ? "bg-red-500 animate-pulse" : "bg-red-400"}`}></span>
            Needs Assignment ({unassignedCount})
          </button>

          {/* Sort By Select */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <ArrowUpDown size={14} className="text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-2.5 py-2 text-xs focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="priority">Highest Priority</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
        
        {(search || statusFilter !== "All" || categoryFilter !== "All" || showUnassignedOnly || sortBy !== "newest") && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-[var(--text-muted)]">
            <X size={16} /> Clear filters
          </Button>
        )}
      </div>

      {/* 3. Complaints table */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-md shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--surface-muted)] text-[var(--text-secondary)] text-sm border-b border-[var(--border-default)]">
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)] text-sm text-[var(--text-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">Loading...</td>
                </tr>
              ) : paginatedComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">No complaints found.</td>
                </tr>
              ) : paginatedComplaints.map(c => (
                <tr 
                  key={c.id}
                  className="hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/admin/complaints/${c.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={c.priority_label || 'Low'} />
                      <PriorityExplainer
                        priorityLabel={c.priority_label || 'Low'}
                        priorityScore={c.priority_score || 0}
                        breakdown={c.priority_breakdown}
                        escalationHistory={c.escalation_history || []}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)] flex items-center gap-2">
                    {c.complaint_id}
                    {c.nyc311_unique_key && (
                      <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-zinc-700 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide">
                        NYC 311
                      </span>
                    )}
                    {c.is_duplicate && <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Dup</span>}
                  </td>
                  <td className="px-4 py-3 capitalize font-medium">{c.category?.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    {c.assigned_officer_name ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-xs text-[var(--text-primary)]">{c.assigned_officer_name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{c.assigned_to}</span>
                      </div>
                    ) : c.assigned_to ? (
                      <span className="bg-[var(--surface-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full text-xs font-medium">
                        {c.assigned_to}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{getRelativeTime(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      
                      {/* Smart Assign Modal Trigger */}
                      <button 
                        onClick={() => setAssignModalComplaint(c)}
                        className="px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                        title="Smart Assign Recommendation Engine"
                      >
                        <Sparkles size={13} className="text-amber-400" />
                        <span className="hidden sm:inline">Assign</span>
                      </button>

                      {/* Assign Inline Quick Menu */}
                      <div className="relative group/menu">
                        <button className="p-1.5 rounded text-[var(--text-secondary)] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Quick Department Transfer">
                          <UserPlus size={16} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-md shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                          <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                            <div className="text-xs font-medium text-[var(--text-muted)] px-2 py-1">Department:</div>
                            <button 
                              onClick={() => handleAssign(c.id, "")}
                              className="w-full text-left px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)] rounded"
                            >
                              Auto (by category)
                            </button>
                            {departments.map(d => (
                              <button 
                                key={d.id} 
                                onClick={() => handleAssign(c.id, d.name)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)] rounded truncate"
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Delete Action */}
                      <button 
                        onClick={() => setDeleteModalId(c)}
                        className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--brand-danger)] hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => navigate(`/admin/complaints/${c.id}`)}
                        className="p-1.5 rounded text-amber-400 hover:bg-amber-400/10 transition-colors ml-1"
                        title="View Full File"
                      >
                        <ChevronRight size={16} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <Pagination 
          total={filteredComplaints.length} 
          perPage={itemsPerPage} 
          currentPage={currentPage} 
          onChange={setCurrentPage} 
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={() => handleDelete(deleteModalId.id)}
        title="Delete Complaint"
        message={`Are you sure you want to delete complaint ${deleteModalId?.complaint_id}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Smart Assign Modal */}
      {assignModalComplaint && (
        <SmartAssignModal
          complaint={assignModalComplaint}
          isOpen={!!assignModalComplaint}
          onClose={() => setAssignModalComplaint(null)}
          onAssigned={() => {
            setAssignModalComplaint(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
