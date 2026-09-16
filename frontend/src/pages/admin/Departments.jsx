import { useEffect, useState } from "react";
import { Building2, Plus, Edit2, AlertCircle, Trash, Lightbulb, Droplets, Layout, AlertTriangle, Info } from "lucide-react";

import { api } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.jsx";
import Button from "../../components/ui/Button.jsx";
import Panel from "../../components/ui/Panel.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { CATEGORIES } from "../../constants.js";

const CATEGORY_ICONS = {
  pothole: AlertTriangle,
  garbage: Trash,
  streetlight: Lightbulb,
  water_supply: Droplets,
  other: Layout
};

export default function Departments() {
  const { toast } = useToast();
  
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ name: "", category: "other", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.get("/departments");
      setDepartments(data);
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
    setForm({ name: "", category: "other", description: "" });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setForm({ name: dept.name, category: dept.category, description: dept.description || "" });
    setEditingId(dept.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/departments/${editingId}`, form);
        toast.success("Department updated");
      } else {
        await api.post("/departments", form);
        toast.success("Department created");
      }
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(e.detail || `Could not ${editingId ? "update" : "create"} department`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Building2 size={24} className="text-[var(--brand-primary)]" />
          Department Management
        </h1>
        <Button onClick={openAddModal} className="gap-2">
          <Plus size={16} /> Add Department
        </Button>
      </div>

      {/* Auto-assign Info Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-md p-4 flex items-start gap-3">
        <Info size={20} className="text-[var(--brand-primary)] shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-[var(--brand-primary)]">Auto-Assign Feature</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            When a complaint is created, the system attempts to auto-assign it based on the complaint's category. 
            Ensure you map exactly one department to each category to make auto-assignment work properly.
          </p>
        </div>
      </div>

      {/* 2. Department cards grid */}
      {loading ? (
        <div className="flex justify-center py-12 text-[var(--text-muted)]">Loading...</div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[var(--surface-card)] rounded-md border border-[var(--border-default)] border-dashed text-[var(--text-muted)]">
          <Building2 size={48} className="mb-4 opacity-20" />
          <p>No departments found</p>
          <Button variant="outline" className="mt-4" onClick={openAddModal}>Create your first department</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const Icon = CATEGORY_ICONS[dept.category] || AlertCircle;
            const categoryLabel = CATEGORIES.find(c => c.value === dept.category)?.label || dept.category;
            
            return (
              <Panel key={dept.id} className="flex flex-col h-full hover:-translate-y-1 transition-transform duration-200">
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">{dept.name}</h3>
                    <div className="p-2 bg-[var(--surface-muted)] rounded-full text-[var(--brand-primary)]" title={categoryLabel}>
                      <Icon size={20} />
                    </div>
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] capitalize">
                      Category: {categoryLabel}
                    </span>
                  </div>
                  
                  <p className="text-sm text-[var(--text-secondary)]">
                    {dept.description || <span className="italic opacity-50">No description provided</span>}
                  </p>
                </div>
                
                <div className="px-5 py-3 border-t border-[var(--border-default)] bg-[var(--surface-muted)] rounded-b-md flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(dept)} className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                    <Edit2 size={14} className="mr-2" /> Edit
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Edit/Add Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Edit Department" : "Add Department"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={submitting}>
              {editingId ? "Save Changes" : "Create Department"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2 text-sm text-[var(--text-primary)]">
          <div className="space-y-1.5">
            <label className="font-medium">Department Name</label>
            <input 
              type="text" 
              className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-3 py-2 focus:outline-none focus:border-[var(--brand-primary)]"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="e.g., Public Works"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="font-medium">Assigned Category</label>
            <select 
              className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-3 py-2 focus:outline-none focus:border-[var(--brand-primary)] capitalize"
              value={form.category}
              onChange={(e) => setForm({...form, category: e.target.value})}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)] mt-1">Complaints of this category will be auto-assigned here.</p>
          </div>
          
          <div className="space-y-1.5">
            <label className="font-medium">Description</label>
            <textarea 
              className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md px-3 py-2 focus:outline-none focus:border-[var(--brand-primary)] min-h-[100px] resize-y"
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Optional description of responsibilities..."
            />
          </div>
        </div>
      </Modal>
      
    </div>
  );
}
