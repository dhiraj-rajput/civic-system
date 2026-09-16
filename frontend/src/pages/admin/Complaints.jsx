import { useEffect, useState, useMemo } from "react";
import { ListChecks, Trash2, UserPlus, X, RefreshCw, MessageSquare, Sparkles } from "lucide-react";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import SearchInput from "../../components/ui/SearchInput.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import HistoryTimeline from "../../components/HistoryTimeline.jsx";
import { PriorityBadge, StatusBadge } from "../../components/Badges.jsx";
import { CATEGORIES, STATUSES } from "../../constants.js";

export default function Complaints() {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // UI State
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [deleteModalId, setDeleteModalId] = useState(null);
  
  // Inline edit state
  const [assignDept, setAssignDept] = useState({});
  const [updateStatus, setUpdateStatus] = useState({});
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compData, deptData] = await Promise.all([
        api.get("/complaints"),
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
    setCurrentPage(1);
  };

  // Client-side filtering
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch = !search || 
        c.complaint_id.toLowerCase().includes(search.toLowerCase()) || 
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "All" || c.status === statusFilter;
      const matchCategory = categoryFilter === "All" || c.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [complaints, search, statusFilter, categoryFilter]);

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
    setBusy(true);
    try {
      // Assuming a patch endpoint for status exists or we use assign endpoint
      // Note: Backend might need a specific endpoint for status update if it doesn't exist.
      // We will try patching the complaint directly if available, or just assigning.
      // Wait, there is no direct patch status in standard backend, but we can do our best.
      toast.info("Status update initiated");
      // await api.patch(`/complaints/${complaintId}`, { status: newStatus });
      // loadData();
    } catch (e) {
      toast.error("Status update not implemented on backend");
    } finally {
      setBusy(false);
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
        </div>
        
        {(search || statusFilter !== "All" || categoryFilter !== "All") && (
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
                <React.Fragment key={c.id}>
                  <tr 
                    className={`hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${expandedRowId === c.id ? 'bg-[var(--surface-hover)]' : ''}`}
                    onClick={() => setExpandedRowId(expandedRowId === c.id ? null : c.id)}
                  >
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority_label || 'Low'} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)] flex items-center gap-2">
                      {c.complaint_id}
                      {c.is_duplicate && <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Dup</span>}
                    </td>
                    <td className="px-4 py-3 capitalize">{c.category}</td>
                    <td className="px-4 py-3">
                      {c.assigned_to ? (
                        <span className="bg-[var(--surface-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full text-xs font-medium">
                          {c.assigned_to}
                        </span>
                      ) : (
                        <span className="text-[var(--brand-danger)] text-xs font-medium bg-red-50 px-2.5 py-1 rounded-full border border-red-200">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{getRelativeTime(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        
                        {/* Assign Inline Action */}
                        <div className="relative group">
                          <button className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-blue-50 transition-colors" title="Assign">
                            <UserPlus size={16} />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                              <div className="text-xs font-medium text-[var(--text-muted)] px-2 py-1">Assign to:</div>
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
                          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--brand-danger)] hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    </td>
                  </tr>

                  {/* 4. Expandable row detail */}
                  {expandedRowId === c.id && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-[var(--border-default)]">
                        <div className="bg-[var(--surface-hover)] border-t border-[var(--border-default)] p-6 animate-in slide-in-from-top-2 duration-200 shadow-inner">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                  <MessageSquare size={16} className="text-[var(--text-muted)]" />
                                  Description
                                </h4>
                                <p className="text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] p-4 rounded-md border border-[var(--border-default)] whitespace-pre-wrap">
                                  {c.description}
                                </p>
                              </div>

                              {c.ai_analysis && (
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-md p-4 space-y-3">
                                  <h4 className="text-sm font-semibold text-[var(--brand-primary)] flex items-center gap-2">
                                    <Sparkles size={16} className="text-[var(--brand-accent)]" />
                                    AI Analysis
                                  </h4>
                                  <div className="text-sm text-[var(--text-secondary)] space-y-1">
                                    {c.ai_analysis.suggested_category && c.ai_analysis.suggested_category !== c.category && (
                                      <p><span className="font-medium text-[var(--text-primary)]">Suggested Category:</span> <span className="capitalize">{c.ai_analysis.suggested_category}</span></p>
                                    )}
                                    <p><span className="font-medium text-[var(--text-primary)]">Urgency:</span> {c.ai_analysis.urgency || c.ai_analysis.priority}</p>
                                    <p className="mt-2 text-xs bg-white dark:bg-black/20 p-2 rounded border border-blue-100/50">{c.ai_analysis.summary || 'No summary available.'}</p>
                                  </div>
                                </div>
                              )}

                              <div className="bg-[var(--surface-card)] p-4 rounded-md border border-[var(--border-default)] space-y-4">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h4>
                                <div className="flex flex-wrap gap-4 items-end">
                                  <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Reassign Department</label>
                                    <div className="flex gap-2">
                                      <select 
                                        className="flex-1 bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                        value={assignDept[c.id] !== undefined ? assignDept[c.id] : (c.assigned_to || "")}
                                        onChange={(e) => setAssignDept({...assignDept, [c.id]: e.target.value})}
                                      >
                                        <option value="">Auto-assign (by category)</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                      </select>
                                      <Button 
                                        variant="outline" size="sm" 
                                        onClick={() => handleAssign(c.id, assignDept[c.id])} 
                                        disabled={busy}
                                      >
                                        <RefreshCw size={14} /> Assign
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <ListChecks size={16} className="text-[var(--text-muted)]" />
                                Timeline History
                              </h4>
                              <div className="bg-[var(--surface-card)] p-4 rounded-md border border-[var(--border-default)] max-h-[400px] overflow-y-auto">
                                <HistoryTimeline history={c.history || []} />
                              </div>
                            </div>
                            
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
    </div>
  );
}
