import { useEffect, useState } from "react";
import { 
  Building2, Plus, Edit2, Trash2, Lightbulb, Droplets, 
  Layout, AlertTriangle, Users, CheckCircle2, Shield, Search
} from "lucide-react";

import { api } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.jsx";
import Button from "../../components/ui/Button.jsx";
import Panel from "../../components/ui/Panel.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import { CATEGORIES } from "../../constants.js";

const CATEGORY_ICONS = {
  pothole: AlertTriangle,
  garbage: Trash2,
  streetlight: Lightbulb,
  water_supply: Droplets,
  other: Layout
};

export default function Departments() {
  const { toast } = useToast();
  
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ 
    name: "", 
    category: "pothole", 
    customCategory: "", 
    description: "", 
    contactEmail: "" 
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptData, complaintsData] = await Promise.all([
        api.get("/departments"),
        api.get("/complaints").catch(() => [])
      ]);
      setDepartments(deptData || []);
    } catch (e) {
      toast.error(e.detail || "Could not load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setForm({ 
      name: "", 
      category: "pothole", 
      customCategory: "", 
      description: "", 
      contactEmail: "" 
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    const isStandard = CATEGORIES.some(c => c.value === dept.category);
    setForm({ 
      name: dept.name, 
      category: isStandard ? dept.category : "custom", 
      customCategory: isStandard ? "" : dept.category, 
      description: dept.description || "",
      contactEmail: dept.contact_email || ""
    });
    setEditingId(dept.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    const finalCategory = form.category === "custom" 
      ? (form.customCategory.trim().toLowerCase().replace(/\s+/g, '_') || "other")
      : form.category;
    
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: finalCategory,
        description: form.description.trim()
      };

      if (editingId) {
        await api.patch(`/departments/${editingId}`, payload);
        toast.success("Department updated successfully");
      } else {
        await api.post("/departments", payload);
        toast.success(`Department "${form.name}" created successfully`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(e.detail || `Could not ${editingId ? "update" : "create"} department`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    try {
      await api.del(`/departments/${deletingDept.id}`);
      toast.success(`Department "${deletingDept.name}" removed`);
      setDeleteConfirmOpen(false);
      setDeletingDept(null);
      loadData();
    } catch (e) {
      toast.error(e.detail || "Could not delete department");
    }
  };

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Building2 size={26} className="text-[var(--brand-primary)]" />
            Department Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure municipal agencies, emergency response divisions, and service routing
          </p>
        </div>
        <Button onClick={openAddModal} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
          <Plus size={18} /> Add Department
        </Button>
      </div>

      {/* 2. Overview Stats & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Building2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{departments.length}</div>
            <div className="text-xs text-[var(--text-secondary)]">Active Agencies</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {new Set(departments.map(d => d.category)).size}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Categories Covered</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Shield size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">Automated</div>
            <div className="text-xs text-[var(--text-secondary)]">Category Smart-Routing</div>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input 
          type="text" 
          placeholder="Search department name, service category, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 transition-colors shadow-sm"
        />
      </div>

      {/* 3. Department Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading municipal departments...</p>
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] border-dashed text-[var(--text-muted)]">
          <Building2 size={48} className="mb-4 opacity-20" />
          <p className="text-base font-medium text-[var(--text-primary)]">No departments found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search query or create a new agency.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={openAddModal}>
            <Plus size={16} /> Create Department
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepts.map((dept) => {
            const Icon = CATEGORY_ICONS[dept.category] || Layout;
            const categoryLabel = CATEGORIES.find(c => c.value === dept.category)?.label || dept.category.replace(/_/g, ' ');
            
            return (
              <div 
                key={dept.id} 
                className="flex flex-col h-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] hover:border-slate-400 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 overflow-hidden group"
              >
                <div className="p-5 flex-1 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-amber-400 border border-slate-200 dark:border-zinc-700 group-hover:scale-105 transition-transform">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {dept.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 mt-1 rounded text-[11px] font-mono uppercase font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-zinc-700">
                          {categoryLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                    {dept.description || <span className="italic opacity-60">General municipal service department</span>}
                  </p>
                </div>
                
                {/* Footer with Edit & Delete */}
                <div className="px-5 py-3 border-t border-[var(--border-default)] bg-[var(--surface-muted)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditModal(dept)} 
                      className="h-8 px-2.5 text-xs text-[var(--text-secondary)] hover:text-slate-900 dark:hover:text-white"
                    >
                      <Edit2 size={13} className="mr-1.5" /> Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setDeletingDept(dept);
                        setDeleteConfirmOpen(true);
                      }} 
                      className="h-8 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Edit Municipal Department" : "Add New Department"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={submitting}>
              {editingId ? "Save Changes" : "Create Agency"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2 text-sm text-[var(--text-primary)]">
          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Department / Agency Name <span className="text-red-400">*</span>
            </label>
            <input 
              type="text" 
              className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-amber-400 text-sm text-[var(--text-primary)]"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="e.g. Queens Rapid Pothole Response Taskforce"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Primary Routing Category <span className="text-red-400">*</span>
            </label>
            <select 
              className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-amber-400 capitalize text-sm text-[var(--text-primary)]"
              value={form.category}
              onChange={(e) => setForm({...form, category: e.target.value})}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Complaints matching this category will be auto-suggested to this department during dispatch.
            </p>
          </div>
          
          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Department Operations & Mandate
            </label>
            <textarea 
              className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-amber-400 min-h-[90px] resize-y text-sm text-[var(--text-primary)]"
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Describe jurisdictions, service hours, repair capabilities..."
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Remove Department?"
        message={`Are you sure you want to remove the "${deletingDept?.name}" department? Existing complaints will retain their historical assignment.`}
        confirmLabel="Remove Department"
        variant="danger"
      />
      
    </div>
  );
}
